import { useState, useEffect, useRef, useCallback } from 'react'
import * as ort from 'onnxruntime-web'

interface DetectionResult {
  isAnomalous: boolean
  confidence: number
  eventType: string
}

const INPUT_SIZE = 640
const NUM_DETECTIONS = 8400
const NUM_CLASSES = 80
const BOX_PARAMS = 4
const CLASSES_BASE_OFFSET = NUM_DETECTIONS * BOX_PARAMS // 33600

// COCO class indices
const PERSON_CLASS = 0
const KNIFE_CLASS = 43

const PERSON_THRESHOLD = 0.40
const KNIFE_THRESHOLD = 0.35

export function useInference() {
  const [loaded, setLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const sessionRef = useRef<ort.InferenceSession | null>(null)
  const previousBoxes = useRef<number[][]>([])
  const frameCount = useRef(0)

  useEffect(() => {
    loadModel()
    return () => {
      sessionRef.current?.release()
    }
  }, [])

  const loadModel = async () => {
    setLoading(true)
    try {
      // Try WebNN first (for NPU acceleration), fall back to WASM
      let session: ort.InferenceSession
      try {
        session = await ort.InferenceSession.create('/models/yolov8_person_detection.onnx', {
          executionProviders: ['webnn'],
        })
        console.log('Using WebNN (NPU) backend')
      } catch {
        session = await ort.InferenceSession.create('/models/yolov8_person_detection.onnx', {
          executionProviders: ['wasm'],
        })
        console.log('Using WASM backend')
      }
      sessionRef.current = session
      setLoaded(true)
    } catch (err) {
      console.error('Failed to load ONNX model:', err)
    } finally {
      setLoading(false)
    }
  }

  const detect = useCallback(async (imageData: ImageData): Promise<DetectionResult> => {
    frameCount.current++
    const session = sessionRef.current
    if (!session) {
      return { isAnomalous: false, confidence: 0, eventType: 'Model not loaded' }
    }

    try {
      const inputTensor = preprocessImage(imageData)
      const feeds = { [session.inputNames[0]]: inputTensor }
      const results = await session.run(feeds)
      const output = results[session.outputNames[0]]
      const outputData = output.data as Float32Array

      // Check knife first (higher severity)
      const knifeResult = checkKnife(outputData)
      if (knifeResult) return knifeResult

      // Check persons and anomalies
      return parsePersonAndAnomalies(outputData)
    } catch (err) {
      console.error('Inference error:', err)
      return { isAnomalous: false, confidence: 0, eventType: `Error: ${err}` }
    }
  }, [])

  const preprocessImage = (imageData: ImageData): ort.Tensor => {
    // Resize to 640x640 using canvas
    const canvas = document.createElement('canvas')
    canvas.width = INPUT_SIZE
    canvas.height = INPUT_SIZE
    const ctx = canvas.getContext('2d')!

    // Draw the source image data to a temp canvas, then scale
    const srcCanvas = document.createElement('canvas')
    srcCanvas.width = imageData.width
    srcCanvas.height = imageData.height
    srcCanvas.getContext('2d')!.putImageData(imageData, 0, 0)
    ctx.drawImage(srcCanvas, 0, 0, INPUT_SIZE, INPUT_SIZE)

    const resized = ctx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE)
    const { data } = resized

    // NCHW format, normalized to [0, 1]
    const floatData = new Float32Array(1 * 3 * INPUT_SIZE * INPUT_SIZE)
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < INPUT_SIZE; y++) {
        for (let x = 0; x < INPUT_SIZE; x++) {
          const srcIdx = (y * INPUT_SIZE + x) * 4 + c
          const dstIdx = c * INPUT_SIZE * INPUT_SIZE + y * INPUT_SIZE + x
          floatData[dstIdx] = data[srcIdx] / 255.0
        }
      }
    }

    return new ort.Tensor('float32', floatData, [1, 3, INPUT_SIZE, INPUT_SIZE])
  }

  const checkKnife = (outputData: Float32Array): DetectionResult | null => {
    const knifeBase = CLASSES_BASE_OFFSET + KNIFE_CLASS * NUM_DETECTIONS
    if (knifeBase >= outputData.length) return null

    let bestKnife = 0
    for (let i = 0; i < NUM_DETECTIONS; i++) {
      const idx = knifeBase + i
      if (idx >= outputData.length) break
      if (outputData[idx] > bestKnife) bestKnife = outputData[idx]
    }

    if (bestKnife > KNIFE_THRESHOLD) {
      return {
        isAnomalous: true,
        confidence: bestKnife,
        eventType: 'Knife Detected - Possible Weapon Threat',
      }
    }
    return null
  }

  const parsePersonAndAnomalies = (outputData: Float32Array): DetectionResult => {
    const personBase = CLASSES_BASE_OFFSET + PERSON_CLASS * NUM_DETECTIONS
    if (personBase >= outputData.length) {
      return { isAnomalous: false, confidence: 0, eventType: 'Unexpected model output' }
    }

    let maxConf = 0
    let bestBox: number[] | null = null

    for (let i = 0; i < NUM_DETECTIONS; i++) {
      const confIdx = personBase + i
      if (confIdx >= outputData.length) break
      const conf = outputData[confIdx]
      if (conf > PERSON_THRESHOLD && conf > maxConf) {
        maxConf = conf
        bestBox = [
          outputData[i],                        // x
          outputData[i + NUM_DETECTIONS],        // y
          outputData[i + 2 * NUM_DETECTIONS],    // w
          outputData[i + 3 * NUM_DETECTIONS],    // h
        ]
      }
    }

    if (bestBox && maxConf > PERSON_THRESHOLD) {
      const [x, y, w, h] = bestBox
      const anomaly = checkAnomalies(x, y, w, h)
      if (anomaly) return anomaly
      return { isAnomalous: false, confidence: maxConf, eventType: 'Person detected - Normal activity' }
    }

    return { isAnomalous: false, confidence: maxConf, eventType: 'No person detected' }
  }

  const checkAnomalies = (x: number, y: number, w: number, h: number): DetectionResult | null => {
    const aspectRatio = h > 0 ? w / h : 0
    const centerY = y / INPUT_SIZE

    // Person in bottom 25% of frame
    if (centerY > 0.75) {
      return { isAnomalous: true, confidence: 0.88, eventType: 'Person Down - Emergency Possible' }
    }

    // Person very wide/flat (lying down)
    if (aspectRatio > 1.5) {
      return { isAnomalous: true, confidence: 0.82, eventType: 'Person Lying Down - Unusual Position' }
    }

    // Rapid movement
    const currentBox = [x, y, w, h]
    const prev = previousBoxes.current
    if (prev.length > 0) {
      const lastBox = prev[prev.length - 1]
      const dx = currentBox[0] - lastBox[0]
      const dy = currentBox[1] - lastBox[1]
      const displacement = Math.sqrt(dx * dx + dy * dy)
      if (displacement > 150) {
        return { isAnomalous: true, confidence: 0.78, eventType: 'Rapid Movement - Running Detected' }
      }
    }

    if (prev.length > 5) prev.shift()
    prev.push(currentBox)

    return null
  }

  return { loaded, loading, detect }
}
