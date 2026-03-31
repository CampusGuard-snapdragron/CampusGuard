package com.haas.campusguard

import android.content.Context
import android.content.SharedPreferences

class SettingsManager(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("campusguard_settings", Context.MODE_PRIVATE)

    var serverUrl: String
        get() = prefs.getString("server_url", "") ?: ""
        set(value) = prefs.edit().putString("server_url", value).apply()

    var authToken: String
        get() = prefs.getString("auth_token", "demo-token") ?: "demo-token"
        set(value) = prefs.edit().putString("auth_token", value).apply()

    var autoSendAlerts: Boolean
        get() = prefs.getBoolean("auto_send_alerts", false)
        set(value) = prefs.edit().putBoolean("auto_send_alerts", value).apply()
}
