package com.haas.campusguard

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession
import java.io.File

class LocalLlmEngine(private val context: Context) {

    companion object {
        private const val TAG = "LocalLlmEngine"
        const val MODEL_FILENAME = "TinyLlama-1.1B-Chat-v1.0_multi-prefill-seq_q8_ekv1280.task"
    }

    private var llmInference: LlmInference? = null
    var isInitialized = false
        private set

    fun initialize(): Boolean {
        val modelFile = File(context.filesDir, MODEL_FILENAME)
        if (!modelFile.exists()) {
            Log.w(TAG, "Model not found at ${modelFile.absolutePath}. Download it in Settings.")
            return false
        }

        return try {
            Log.d(TAG, "Loading LLM model (${modelFile.length() / 1024 / 1024} MB)...")

            // Engine-level options (only model path + token budget)
            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(modelFile.absolutePath)
                .setMaxTokens(512)
                .ok build()

            llmInference = LlmInference.createFromOptions(context, options)
            isInitialized = true
            Log.d(TAG, "LLM initialized successfully on GPU")
            true
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize LLM: ${e.message}", e)
            false
        }
    }

    fun analyzeThreat(eventType: String, confidence: Float, verdict: String): String? {
        val engine = llmInference ?: return null
        if (!isInitialized) return null

        val prompt = """You are CampusGuard AI, a campus security threat analyst. Analyze this security alert concisely.

ALERT:
- Event: $eventType
- Confidence: ${(confidence * 100).toInt()}%
- Operator Verdict: $verdict

Respond with:
SEVERITY: (critical/high/medium/low)
ASSESSMENT: (2 sentences max)
ACTION: (1-2 recommended actions)"""

        return try {
            val startTime = System.currentTimeMillis()

            // Session-level options (temperature, topK for generation control)
            val sessionOptions = LlmInferenceSession.LlmInferenceSessionOptions.builder()
                .setTopK(20)
                .setTemperature(0.3f)
                .build()

            val session = LlmInferenceSession.createFromOptions(engine, sessionOptions)
            session.addQueryChunk(prompt)
            val response = session.generateResponse()

            val elapsed = System.currentTimeMillis() - startTime
            Log.d(TAG, "LLM analysis completed in ${elapsed}ms")
            response
        } catch (e: Exception) {
            Log.e(TAG, "LLM generation failed: ${e.message}", e)
            null
        }
    }

    fun isModelDownloaded(): Boolean {
        return File(context.filesDir, MODEL_FILENAME).exists()
    }

    fun getModelFile(): File {
        return File(context.filesDir, MODEL_FILENAME)
    }

    fun close() {
        try {
            llmInference?.close()
        } catch (_: Exception) {}
    }
}
