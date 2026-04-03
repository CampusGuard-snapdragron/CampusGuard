package com.haas.campusguard

import android.content.Context
import android.util.Log
import com.google.mediapipe.tasks.genai.llminference.LlmInference
import java.io.File

class LocalLlmEngine(private val context: Context) {

    companion object {
        private const val TAG = "LocalLlmEngine"
        const val MODEL_FILENAME = "gemma3-1b-it-int4.task"
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
            val options = LlmInference.LlmInferenceOptions.builder()
                .setModelPath(modelFile.absolutePath)
                .setMaxTokens(200)
                .setTopK(20)
                .build()

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
        if (!isInitialized || llmInference == null) return null

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
            val response = llmInference?.generateResponse(prompt)
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
