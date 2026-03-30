import { useState, useEffect, useRef, useCallback } from 'react'
import { Camera, Play, Square, AlertTriangle } from 'lucide-react'
import { useInference } from '../hooks/useInference'

export default function CameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [streaming, setStreaming] = useState(false)
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [selectedDevice, setSelectedDevice] = useState<string>('')
  const [detectionLog, setDetectionLog] = useState<string[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)

  const { loaded, loading, detect } = useInference()

  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const cameras = devs.filter(d => d.kind === 'videoinput')
      setDevices(cameras)
      if (cameras.length > 0) setSelectedDevice(cameras[0].deviceId)
    })
    return () => stopCamera()
  }, [])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: selectedDevice ? { exact: selectedDevice } : undefined, width: 640, height: 480 }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStreaming(true)
      startDetectionLoop()
    } catch (err) {
      console.error('Camera error:', err)
      addLog(`Camera error: ${err}`)
    }
  }

  const stopCamera = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStreaming(false)
  }

  const addLog = useCallback((msg: string) => {
    const time = new Date().toLocaleTimeString()
    setDetectionLog(prev => [`[${time}] ${msg}`, ...prev].slice(0, 50))
  }, [])

  const startDetectionLoop = () => {
    let frameCount = 0
    intervalRef.current = window.setInterval(async () => {
      frameCount++
      if (frameCount % 15 !== 0) return // process every 15th tick (~1 per sec at 15fps interval)

      const video = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || !loaded) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      canvas.width = 640
      canvas.height = 480
      ctx.drawImage(video, 0, 0, 640, 480)

      const imageData = ctx.getImageData(0, 0, 640, 480)
      const result = await detect(imageData)

      if (result.isAnomalous) {
        addLog(`ALERT: ${result.eventType} (${(result.confidence * 100).toFixed(0)}%)`)

        // Send to local database
        if (window.electronAPI) {
          window.electronAPI.addLocalAlert({
            deviceId: 'local-webcam',
            eventType: result.eventType,
            modelConfidence: result.confidence,
            operatorVerdict: 'AUTO',
            notes: 'Detected by local webcam',
            severity: result.confidence > 0.8 ? 'high' : 'medium',
          })
        }
      } else if (frameCount % 150 === 0) {
        addLog(result.eventType)
      }
    }, 66) // ~15fps
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Camera size={24} /> Local Camera Monitor
        </h2>
        <div className="flex items-center gap-3">
          <select
            value={selectedDevice}
            onChange={e => setSelectedDevice(e.target.value)}
            disabled={streaming}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm"
          >
            {devices.map(d => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || `Camera ${d.deviceId.slice(0, 8)}`}
              </option>
            ))}
          </select>
          {streaming ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Square size={16} /> Stop
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-sm font-medium transition-colors"
            >
              <Play size={16} /> Start
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 text-yellow-400 text-sm">
          Loading ONNX model... This may take a moment.
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        {/* Video feed */}
        <div className="col-span-2 bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            className="w-full aspect-video bg-black"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Detection log */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Detection Log
          </h3>
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {detectionLog.length === 0 ? (
              <p className="text-xs text-gray-600">Start camera to begin detection...</p>
            ) : (
              detectionLog.map((log, i) => (
                <p
                  key={i}
                  className={`text-xs font-mono ${
                    log.includes('ALERT') ? 'text-red-400' : 'text-gray-500'
                  }`}
                >
                  {log}
                </p>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
