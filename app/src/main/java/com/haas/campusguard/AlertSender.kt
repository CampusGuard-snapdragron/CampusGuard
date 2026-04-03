package com.haas.campusguard

import android.graphics.Bitmap
import android.util.Base64
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.util.concurrent.TimeUnit

class AlertSender(
    private val apiBase: String,
    private val token: String
) {
    private val client = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .readTimeout(10, TimeUnit.SECONDS)
        .build()
    private val jsonType = "application/json; charset=utf-8".toMediaType()

    init {
        Log.d("AlertSender", "Configured with apiBase='$apiBase'")
    }

    fun sendAlert(
        deviceId: String,
        eventType: String,
        modelConfidence: Float?,
        operatorVerdict: String, // "YES" or "MAYBE"
        frameBitmap: Bitmap?,
        notes: String? = null
    ) {
        if (apiBase.isBlank()) {
            Log.w("AlertSender", "Server URL is blank — alert not sent. Set URL in Settings.")
            return
        }

        val obj = JSONObject().apply {
            put("deviceId", deviceId)
            put("eventType", eventType)
            put("operatorVerdict", operatorVerdict)
            if (modelConfidence != null) put("modelConfidence", modelConfidence.toDouble())
            if (notes != null) put("notes", notes)

            if (frameBitmap != null) {
                val baos = ByteArrayOutputStream()
                frameBitmap.compress(Bitmap.CompressFormat.JPEG, 70, baos)
                val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
                put("imageBase64", b64)
            }
        }

        val url = "$apiBase/alert"
        Log.d("AlertSender", "Sending alert to $url (verdict=$operatorVerdict)")

        val req = Request.Builder()
            .url(url)
            .addHeader("x-campusguard-token", token)
            .post(obj.toString().toRequestBody(jsonType))
            .build()

        client.newCall(req).enqueue(object : okhttp3.Callback {
            override fun onFailure(call: okhttp3.Call, e: java.io.IOException) {
                Log.e("AlertSender", "Failed to send alert to $url: ${e.message}", e)
            }

            override fun onResponse(call: okhttp3.Call, response: okhttp3.Response) {
                if (response.isSuccessful) {
                    Log.d("AlertSender", "Alert sent successfully (${response.code})")
                } else {
                    Log.e("AlertSender", "Alert rejected: ${response.code} ${response.message}")
                }
                response.close()
            }
        })
    }
}
