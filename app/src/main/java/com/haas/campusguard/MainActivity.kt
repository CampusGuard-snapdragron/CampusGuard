package com.haas.campusguard

import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.haas.campusguard.ui.theme.CampusGuardTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.*
import java.util.concurrent.TimeUnit

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            CampusGuardTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    CampusGuardApp()
                }
            }
        }
    }
}

@Composable
fun CampusGuardApp() {
    val navController = rememberNavController()

    NavHost(navController = navController, startDestination = "home") {
        composable("home") {
            MainScreen(
                onStartMonitoring = { navController.navigate("camera") },
                onOpenHistory = { navController.navigate("history") },
                onOpenSettings = { navController.navigate("settings") }
            )
        }
        composable("camera") {
            CameraScreen()
        }
        composable("history") {
            AlertHistoryScreen(onBack = { navController.popBackStack() })
        }
        composable("settings") {
            SettingsScreen(onBack = { navController.popBackStack() })
        }
    }
}

@Composable
fun MainScreen(
    onStartMonitoring: () -> Unit,
    onOpenHistory: () -> Unit,
    onOpenSettings: () -> Unit
) {
    val context = LocalContext.current
    val historyManager = remember { AlertHistoryManager(context) }
    val alertCount = remember { historyManager.getAlerts().size }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = "CampusGuard",
            style = MaterialTheme.typography.displayMedium,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = "Real-time Campus Safety Monitoring",
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )

        Spacer(modifier = Modifier.height(16.dp))

        // Quick stats
        Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(
                containerColor = MaterialTheme.colorScheme.surfaceVariant
            )
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(16.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text("$alertCount", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                    Text("Total Alerts", style = MaterialTheme.typography.labelSmall)
                }
            }
        }

        Spacer(modifier = Modifier.height(32.dp))

        Button(
            onClick = onStartMonitoring,
            modifier = Modifier.fillMaxWidth().height(56.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary
            )
        ) {
            Icon(Icons.Default.PlayArrow, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Start Monitoring", style = MaterialTheme.typography.titleMedium)
        }

        Spacer(modifier = Modifier.height(12.dp))

        OutlinedButton(
            onClick = onOpenHistory,
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Icon(Icons.Default.List, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Alert History")
        }

        Spacer(modifier = Modifier.height(8.dp))

        OutlinedButton(
            onClick = onOpenSettings,
            modifier = Modifier.fillMaxWidth().height(48.dp)
        ) {
            Icon(Icons.Default.Settings, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Settings")
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AlertHistoryScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val historyManager = remember { AlertHistoryManager(context) }
    var alerts by remember { mutableStateOf(historyManager.getAlerts()) }
    val dateFormat = remember { SimpleDateFormat("MMM dd, HH:mm:ss", Locale.getDefault()) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Alert History") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                },
                actions = {
                    if (alerts.isNotEmpty()) {
                        IconButton(onClick = {
                            historyManager.clear()
                            alerts = emptyList()
                        }) {
                            Icon(Icons.Default.Delete, "Clear history")
                        }
                    }
                }
            )
        }
    ) { padding ->
        if (alerts.isEmpty()) {
            Box(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    "No alerts recorded yet.\nStart monitoring to detect anomalies.",
                    textAlign = TextAlign.Center,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        } else {
            LazyColumn(
                modifier = Modifier.fillMaxSize().padding(padding),
                contentPadding = PaddingValues(16.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                items(alerts) { alert ->
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        colors = CardDefaults.cardColors(
                            containerColor = when (alert.verdict) {
                                "YES" -> MaterialTheme.colorScheme.errorContainer
                                "MAYBE" -> MaterialTheme.colorScheme.tertiaryContainer
                                else -> MaterialTheme.colorScheme.surfaceVariant
                            }
                        )
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    alert.eventType,
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    modifier = Modifier.weight(1f)
                                )
                                AssistChip(
                                    onClick = {},
                                    label = { Text(alert.verdict) },
                                    colors = AssistChipDefaults.assistChipColors()
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                "Confidence: ${(alert.confidence * 100).toInt()}% | ${dateFormat.format(Date(alert.timestamp))}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val settingsManager = remember { SettingsManager(context) }
    val llmEngine = remember { LocalLlmEngine(context) }
    val coroutineScope = rememberCoroutineScope()

    var serverUrl by remember { mutableStateOf(settingsManager.serverUrl) }
    var authToken by remember { mutableStateOf(settingsManager.authToken) }
    var autoSend by remember { mutableStateOf(settingsManager.autoSendAlerts) }
    var saved by remember { mutableStateOf(false) }

    // LLM model state
    var modelDownloaded by remember { mutableStateOf(llmEngine.isModelDownloaded()) }
    var downloadProgress by remember { mutableStateOf(-1f) }
    var downloadStatus by remember { mutableStateOf("") }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Settings") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, "Back")
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // ── Server Configuration ──
            Text(
                "Server Configuration",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Server URL") },
                placeholder = { Text("https://your-server.railway.app") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = authToken,
                onValueChange = { authToken = it },
                label = { Text("Auth Token") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Text("Auto-send confirmed alerts")
                Switch(
                    checked = autoSend,
                    onCheckedChange = { autoSend = it }
                )
            }

            Button(
                onClick = {
                    settingsManager.serverUrl = serverUrl
                    settingsManager.authToken = authToken
                    settingsManager.autoSendAlerts = autoSend
                    saved = true
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (saved) "Saved!" else "Save Settings")
            }

            if (saved) {
                Text(
                    "Settings saved. Restart monitoring for changes to take effect.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.primary
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            // ── AI Threat Analysis ──
            Text(
                "AI Threat Analysis",
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold
            )

            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = if (modelDownloaded)
                        MaterialTheme.colorScheme.primaryContainer
                    else MaterialTheme.colorScheme.surfaceVariant
                )
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    if (modelDownloaded) {
                        Text(
                            "AI Ready",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.primary
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Gemma 3 1B is running on-device. " +
                            "Threat analysis runs automatically when you confirm alerts.",
                            style = MaterialTheme.typography.bodySmall
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        val modelFile = llmEngine.getModelFile()
                        Text(
                            "Model size: ${modelFile.length() / 1024 / 1024} MB",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else if (downloadProgress >= 0f) {
                        Text(
                            "Downloading AI Model...",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { downloadProgress },
                            modifier = Modifier.fillMaxWidth(),
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            downloadStatus,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Text(
                            "On-Device AI Not Set Up",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Download a small AI model to analyze threats directly on your phone. " +
                            "No internet needed for analysis after setup.",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        if (downloadStatus.isNotEmpty()) {
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                downloadStatus,
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.error
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                        Button(
                            onClick = {
                                downloadProgress = 0f
                                downloadStatus = "Connecting..."
                                coroutineScope.launch(Dispatchers.IO) {
                                    try {
                                        val modelUrl = "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.task"
                                        val client = OkHttpClient.Builder()
                                            .connectTimeout(30, TimeUnit.SECONDS)
                                            .readTimeout(5, TimeUnit.MINUTES)
                                            .followRedirects(true)
                                            .build()

                                        val request = Request.Builder().url(modelUrl).build()
                                        val response = client.newCall(request).execute()

                                        if (!response.isSuccessful) {
                                            withContext(Dispatchers.Main) {
                                                downloadStatus = "Download failed (HTTP ${response.code}). Check your connection."
                                                downloadProgress = -1f
                                            }
                                            return@launch
                                        }

                                        val body = response.body ?: throw Exception("Empty response")
                                        val totalBytes = body.contentLength()
                                        val modelFile = llmEngine.getModelFile()
                                        val tempFile = File(modelFile.parent, "${modelFile.name}.tmp")

                                        body.byteStream().use { input ->
                                            FileOutputStream(tempFile).use { output ->
                                                val buffer = ByteArray(8192)
                                                var bytesRead: Long = 0
                                                var len: Int

                                                while (input.read(buffer).also { len = it } != -1) {
                                                    output.write(buffer, 0, len)
                                                    bytesRead += len
                                                    val progress = if (totalBytes > 0) bytesRead.toFloat() / totalBytes else 0f
                                                    withContext(Dispatchers.Main) {
                                                        downloadProgress = progress
                                                        val mbDown = bytesRead / 1024 / 1024
                                                        val mbTotal = if (totalBytes > 0) totalBytes / 1024 / 1024 else 0
                                                        downloadStatus = "Downloading: $mbDown / $mbTotal MB"
                                                    }
                                                }
                                            }
                                        }

                                        tempFile.renameTo(modelFile)

                                        withContext(Dispatchers.Main) {
                                            modelDownloaded = true
                                            downloadProgress = -1f
                                            downloadStatus = ""
                                        }
                                    } catch (e: Exception) {
                                        Log.e("Settings", "Model download failed: ${e.message}", e)
                                        withContext(Dispatchers.Main) {
                                            downloadStatus = "Download failed: ${e.message}"
                                            downloadProgress = -1f
                                        }
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Set Up AI Analysis (downloads ~529 MB)")
                        }
                    }
                }
            }
        }
    }
}
