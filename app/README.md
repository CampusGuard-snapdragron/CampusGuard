# 🛡️ CampusGuard

Real-time, on-device AI system for campus safety monitoring built for the Snapdragon Multiverse Hackathon at Columbia University.

## 📱 Overview

CampusGuard is a privacy-first, agentic AI application that performs real-time campus safety monitoring using **Snapdragon 8 Elite (Samsung Galaxy S25)** for on-device AI inference. The system detects safety-critical events like falls, unusual behavior, and rapid movement without streaming raw video to the cloud.

### Key Features

- **🔒 Privacy-First**: All AI processing happens on-device - no video leaves your phone
- **⚡ Real-Time Detection**: Person detection and anomaly analysis in real-time
- **🤖 Multi-Device Architecture**:
    - S25: Real-time perception and local decision-making
    - Snapdragon X Elite PC: Multi-agent reasoning and alert dashboard
- **👤 Human-in-the-Loop**: User confirms alerts before escalation
- **📊 Smart Escalation**: Three-tier alert system (Dismiss / Security / Campus-wide)

## 🏗️ Architecture
```
┌─────────────────────────────┐
│   S25 (Snapdragon 8 Elite)  │
│  • Camera capture            │
│  • Person detection (YOLO)   │
│  • Anomaly detection         │
│  • User confirmation UI      │
└──────────────┬──────────────┘
               │ WebSocket
               │ (Structured events only)
               ↓
┌─────────────────────────────┐
│ X Elite PC (Dashboard)      │
│  • Alert aggregation         │
│  • Event visualization       │
│  • Multi-device coordination │
└─────────────────────────────┘
```

## 🧠 AI Models

### YOLOv8 Person Detection
- **Source**: Qualcomm AI Hub
- **Input**: 640×640 RGB images
- **Task**: Person detection (COCO class 0)
- **Runtime**: ONNX Runtime for Android
- **Performance**: ~80-100ms inference on S25

### Anomaly Detection Rules
1. **Person Down**: Bounding box in bottom 25% of frame
2. **Unusual Posture**: Aspect ratio > 1.5 (lying down)
3. **Rapid Movement**: Displacement > 150px between frames
4. **Crowd Formation**: 5+ people detected suddenly

## 🚀 Getting Started

### Prerequisites

- Android Studio Ladybug | 2024.2.1+
- Snapdragon 8 Elite device (Samsung Galaxy S25) or emulator
- Kotlin 1.9+
- Minimum SDK: API 26 (Android 8.0)

### Installation

1. **Clone the repository**
```bash
   git clone https://github.com/yourusername/CampusGuard.git
   cd CampusGuard
```

2. **Open in Android Studio**
    - File → Open → Select CampusGuard folder

3. **Sync Gradle**
    - Android Studio will auto-sync dependencies

4. **Connect S25 device**
    - Enable Developer Mode and USB Debugging
    - Connect via USB

5. **Run the app**
    - Click Run ▶️ or press Shift+F10

### First Time Setup

The app will request camera permissions on first launch. Grant permission to enable AI detection.

## 📦 Dependencies
```kotlin
// Core Android
implementation("androidx.core:core-ktx:1.12.0")
implementation("androidx.activity:activity-compose:1.8.2")

// Jetpack Compose
implementation("androidx.compose.material3:material3")
implementation("androidx.navigation:navigation-compose:2.7.6")

// CameraX
implementation("androidx.camera:camera-core:1.3.1")
implementation("androidx.camera:camera-camera2:1.3.1")
implementation("androidx.camera:camera-lifecycle:1.3.1")
implementation("androidx.camera:camera-view:1.3.1")

// AI/ML
implementation("com.microsoft.onnxruntime:onnxruntime-android:1.17.0")

// Networking
implementation("com.squareup.okhttp3:okhttp:4.12.0")
implementation("com.google.code.gson:gson:2.10.1")

// Permissions
implementation("com.google.accompanist:accompanist-permissions:0.34.0")
```

## 🎯 Usage

### Basic Workflow

1. **Launch App** → Tap "Start Monitoring"
2. **Grant Permissions** → Camera access required
3. **AI Monitoring Active** → Point camera at scene
4. **Alert Triggered** → When suspicious activity detected
5. **User Confirmation** → Choose alert level:
    - 🟢 **No - It's Fine**: Dismiss (logged as false positive)
    - 🟡 **Maybe - Not Sure**: Alert security team only
    - 🔴 **Yes - Definitely**: Campus-wide alert

### Demo Scenarios

**Test the detection:**
- **Normal Standing**: No alert
- **Crouch/Sit Down**: May trigger unusual posture
- **Lie on Ground**: Should trigger "Person Down" alert
- **Run Quickly**: Should trigger rapid movement alert

## 🏆 Hackathon Details

**Event**: Snapdragon Multiverse Hackathon at Columbia University  
**Dates**: February 6-7, 2026  
**Track**: Multi-device AI for Campus Safety  
**Devices Used**:
- Snapdragon 8 Elite (Samsung Galaxy S25)
- Snapdragon X Elite (Copilot+ PC)

## 📊 Datasets Used

- **COCO 2017**: Person detection training
- **CUHK Avenue**: Behavioral anomaly detection
- **UR Fall Detection**: Fall detection patterns

## 🔮 Future Enhancements

- [ ] Multi-camera spatial reasoning
- [ ] Pose estimation with MediaPipe
- [ ] Adaptive anomaly thresholds
- [ ] Historical alert analytics
- [ ] Integration with campus security systems
- [ ] XR-based security visualization

## 📝 Project Structure
```
CampusGuard/
├── app/
│   ├── src/main/
│   │   ├── assets/
│   │   │   ├── yolov8_person_detection.onnx
│   │   │   └── movenet_model.onnx
│   │   ├── java/com/haas/campusguard/
│   │   │   ├── MainActivity.kt
│   │   │   ├── CameraScreen.kt
│   │   │   ├── InferenceEngine.kt
│   │   │   ├── WebSocketClient.kt
│   │   │   └── Models.kt
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts
├── dashboard/              (Python/Streamlit - separate repo)
└── README.md
```

## 🛠️ Development

### Building from Source
```bash
# Debug build
./gradlew assembleDebug

# Release build
./gradlew assembleRelease

# Run tests
./gradlew test
```

### Debugging

Enable verbose logging:
```kotlin
// Filter Logcat by:
InferenceEngine  // AI model debugging
CameraScreen     // Camera & detection flow
WebSocketClient  // Network communication
```

## 🤝 Contributing

This was built for the Snapdragon Multiverse Hackathon. Contributions, issues, and feature requests are welcome!

## 📄 License

MIT License - see LICENSE file for details

## 👥 Team

- **Haasita Pinnepu** - Data Science MS @ Columbia University
- Built during Snapdragon Multiverse Hackathon 2026

## 🙏 Acknowledgments

- Qualcomm AI Hub for pre-trained models
- Columbia University Data Science Institute
- Snapdragon Developer Relations team
- Ultralytics for YOLOv8

## 📧 Contact

For questions or collaboration:
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@columbia.edu

---

**Built with ❤️ using Snapdragon AI technologies**
