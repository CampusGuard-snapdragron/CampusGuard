package com.haas.campusguard

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

data class AlertRecord(
    val eventType: String,
    val confidence: Float,
    val verdict: String,
    val timestamp: Long = System.currentTimeMillis()
)

class AlertHistoryManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("campusguard_history", Context.MODE_PRIVATE)
    private val gson = Gson()

    fun addAlert(record: AlertRecord) {
        val history = getAlerts().toMutableList()
        history.add(0, record)
        // Keep max 100
        val trimmed = history.take(100)
        prefs.edit().putString("alerts", gson.toJson(trimmed)).apply()
    }

    fun getAlerts(): List<AlertRecord> {
        val json = prefs.getString("alerts", "[]") ?: "[]"
        val type = object : TypeToken<List<AlertRecord>>() {}.type
        return try {
            gson.fromJson(json, type)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun clear() {
        prefs.edit().remove("alerts").apply()
    }
}
