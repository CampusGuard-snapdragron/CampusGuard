package com.haas.campusguard

import android.Manifest
import android.graphics.Bitmap
import android.provider.Settings
import android.util.Log
import androidx.camera.core.*
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun CameraScreen() {
    val cameraPermissionState = rememberPermissionState(Manifest.permission.CAMERA)

    LaunchedEffect(Unit) {
        if (!cameraPermissionState.status.isGranted) {
            cameraPermissionState.launchPermissionRequest()
        }
    }

    when {
        cameraPermissionState.status.isGranted -> CameraPreviewScreen()
        else -> PermissionDeniedScreen()
    }
}

@Composable
fun CameraPreviewScreen() {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current

    // Unique device id for demo (stable per phone)
    val deviceId = remember {
        Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID) ?: "unknown-device"
    }

    // Initialize inference engine
    val inferenceEngine = remember { InferenceEngine(context) }

    // Configurable server URL from settings
    val settingsManager = remember { SettingsManager(context) }
    val alertHistoryManager = remember { AlertHistoryManager(context) }
    val alertSender = remember {
        AlertSender(
            apiBase = settingsManager.serverUrl,
            token = settingsManager.authToken
        )
    }

    var detectionResult by remember { mutableStateOf<DetectionResult?>(null) }
    var showAlertDialog by remember { mutableStateOf(false) }

    // Keep the latest frame to attach as a screengrab
    var lastFrameBitmap by remember { mutableStateOf<Bitmap?>(null) }

    val cameraExecutor: ExecutorService = remember { Executors.newSingleThreadExecutor() }

    Box(modifier = Modifier.fillMaxSize()) {
        AndroidView(
            factory = { ctx ->
                val previewView = PreviewView(ctx)
                val cameraProviderFuture = ProcessCameraProvider.getInstance(ctx)

                cameraProviderFuture.addListener({
                    val cameraProvider = cameraProviderFuture.get()

                    val preview = Preview.Builder().build().apply {
                        setSurfaceProvider(previewView.surfaceProvider)
                    }

                    val imageAnalysis = ImageAnalysis.Builder()
                        .setTargetResolution(android.util.Size(640, 480))
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()

                    var frameCount = 0

                    imageAnalysis.setAnalyzer(cameraExecutor) { imageProxy ->
                        frameCount++

                        // Process every 15th frame to reduce compute
                        if (frameCount % 15 == 0) {
                            try {
                                val bitmap = imageProxy.toBitmap()

                                // Save latest frame (scaled smaller for network + memory)
                                lastFrameBitmap = Bitmap.createScaledBitmap(bitmap, 640, 480, true)

                                val result = inferenceEngine.detectAnomaly(bitmap)

                                Log.d(
                                    "CameraScreen",
                                    "Detection: ${result.eventType}, conf=${result.confidence}, anomalous=${result.isAnomalous}"
                                )

                                if (result.isAnomalous && result.confidence > 0.35f) {
                                    detectionResult = result
                                    showAlertDialog = true
                                }

                            } catch (e: Exception) {
                                Log.e("CameraScreen", "Detection failed: ${e.message}", e)
                            }
                        }

                        imageProxy.close()
                    }

                    val cameraSelector = CameraSelector.DEFAULT_BACK_CAMERA

                    try {
                        cameraProvider.unbindAll()
                        cameraProvider.bindToLifecycle(
                            lifecycleOwner,
                            cameraSelector,
                            preview,
                            imageAnalysis
                        )
                    } catch (e: Exception) {
                        Log.e("CameraScreen", "Camera binding failed", e)
                    }

                }, ContextCompat.getMainExecutor(ctx))

                previewView
            },
            modifier = Modifier.fillMaxSize()
        )

        // Status overlay
        Card(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(16.dp)
        ) {
            Text(
                text = "🛡️ CampusGuard Monitoring...",
                modifier = Modifier.padding(12.dp),
                style = MaterialTheme.typography.titleMedium
            )
        }
    }

    // Alert Dialog
    if (showAlertDialog && detectionResult != null) {
        AlertDialogComposable(
            result = detectionResult!!,
            onDismiss = {
                showAlertDialog = false
                detectionResult = null
            },
            onResponse = { level ->
                Log.d("CameraScreen", "User selected: $level")

                // Map UI choice to server verdict
                val verdict = when (level) {
                    AlertLevel.HIGH -> "YES"
                    AlertLevel.MEDIUM -> "MAYBE"
                    AlertLevel.LOW -> null // don't send
                }

                if (verdict != null) {
                    val frameToSend = lastFrameBitmap
                    val res = detectionResult!!

                    // Save to local history
                    alertHistoryManager.addAlert(
                        AlertRecord(
                            eventType = res.eventType,
                            confidence = res.confidence,
                            verdict = verdict
                        )
                    )

                    alertSender.sendAlert(
                        deviceId = deviceId,
                        eventType = res.eventType,
                        modelConfidence = res.confidence,
                        operatorVerdict = verdict,
                        frameBitmap = frameToSend,
                        notes = "Operator confirmed on phone"
                    )
                }

                showAlertDialog = false
                detectionResult = null
            }
        )
    }
}

@Composable
fun AlertDialogComposable(
    result: DetectionResult,
    onDismiss: () -> Unit,
    onResponse: (AlertLevel) -> Unit
) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("⚠️ Suspicious Activity Detected") },
        text = {
            Column {
                Text("Confidence: ${(result.confidence * 100).toInt()}%")
                Spacer(modifier = Modifier.height(8.dp))
                Text("Detected: ${result.eventType}")
                Spacer(modifier = Modifier.height(16.dp))
                Text("Does this look suspicious to you?")
            }
        },
        confirmButton = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Button(
                    onClick = { onResponse(AlertLevel.HIGH) },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error)
                ) {
                    Text("🔴 Yes - Definitely")
                }
                Button(
                    onClick = { onResponse(AlertLevel.MEDIUM) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🟡 Maybe - Not Sure")
                }
                OutlinedButton(
                    onClick = { onResponse(AlertLevel.LOW) },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("🟢 No - It's Fine")
                }
            }
        }
    )
}

@Composable
fun PermissionDeniedScreen() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Text(
                text = "📷 Camera Permission Required",
                style = MaterialTheme.typography.titleLarge
            )
            Spacer(modifier = Modifier.height(16.dp))
            Text(
                text = "CampusGuard needs camera access to monitor for suspicious activity.",
                style = MaterialTheme.typography.bodyMedium
            )
        }
    }
}

// Extension function to convert ImageProxy to Bitmap
fun ImageProxy.toBitmap(): Bitmap {
    val yBuffer = planes[0].buffer
    val uBuffer = planes[1].buffer
    val vBuffer = planes[2].buffer

    val ySize = yBuffer.remaining()
    val uSize = uBuffer.remaining()
    val vSize = vBuffer.remaining()

    val nv21 = ByteArray(ySize + uSize + vSize)

    yBuffer.get(nv21, 0, ySize)
    vBuffer.get(nv21, ySize, vSize)
    uBuffer.get(nv21, ySize + vSize, uSize)

    val yuvImage = android.graphics.YuvImage(
        nv21,
        android.graphics.ImageFormat.NV21,
        this.width,
        this.height,
        null
    )

    val out = java.io.ByteArrayOutputStream()
    yuvImage.compressToJpeg(
        android.graphics.Rect(0, 0, this.width, this.height),
        90,
        out
    )

    val imageBytes = out.toByteArray()
    return android.graphics.BitmapFactory.decodeByteArray(imageBytes, 0, imageBytes.size)
}

// Data classes
data class DetectionResult(
    val isAnomalous: Boolean,
    val confidence: Float,
    val eventType: String
)

enum class AlertLevel {
    HIGH,
    MEDIUM,
    LOW
}
