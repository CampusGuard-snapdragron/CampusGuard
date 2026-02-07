# CampusGuard 🛡️

**Real-Time AI-Powered Campus Safety Monitoring**

CampusGuard is an intelligent Android application that leverages edge AI and computer vision to enhance campus safety through real-time threat detection and emergency response coordination.

---

## 🎯 Application Description

CampusGuard transforms mobile devices into intelligent safety monitors that detect and respond to potential threats in real-time. Using on-device AI models powered by Qualcomm Snapdragon technology, the app processes camera feeds locally to identify weapons, suspicious activities, and emergency situations without requiring cloud connectivity.

### Key Features

- **Real-Time Threat Detection**: On-device AI analyzes camera feeds to identify weapons, suspicious behavior, and emergency situations
- **Edge AI Processing**: All AI inference runs locally on the device using ONNX Runtime and Qualcomm Snapdragon processors
- **Instant Alerts**: Immediate notifications to security personnel and emergency services when threats are detected
- **Geolocation Tracking**: GPS integration for precise incident location reporting
- **Emergency Response Dashboard**: Real-time monitoring interface for security teams
- **Offline Capability**: Functions without internet connectivity for reliable campus-wide coverage
- **Privacy-First Design**: All video processing happens on-device; no data sent to cloud unless explicitly shared during an emergency

### Technical Highlights

- **100% Edge Computing**: AI models run entirely on mobile devices with no cloud dependency for inference
- **Optimized for Snapdragon**: Leverages Qualcomm's Neural Processing SDK for efficient on-device AI
- **Low Latency**: Sub-second detection and alert times
- **Battery Efficient**: Optimized model inference for extended operation
- **Scalable Architecture**: Supports multiple concurrent monitoring devices

---

## 👥 Team Information

**Team Members:**
- Haasita Pinnepu - hpinnepu@gmail.com
- Arya Shidore - aryashidore2002@gmail.com
- Kanchan Bhale - kvb2117@columbia.edu

---

## 🚀 Setup Instructions

### Prerequisites

Before you begin, ensure you have the following installed:

1. **Android Studio**: Hedgehog (2023.1.1) or later
    - Download from: https://developer.android.com/studio

2. **Android SDK**:
    - Minimum SDK: API 24 (Android 7.0)
    - Target SDK: API 34 (Android 14)
    - Build Tools: 34.0.0

3. **Java Development Kit (JDK)**: JDK 17 or later
    - Verify with: `java -version`

4. **Git**: For cloning the repository
    - Download from: https://git-scm.com/downloads

### Dependencies

The application uses the following key dependencies (automatically managed by Gradle):

- **Kotlin**: 1.9.0
- **AndroidX Core KTX**: 1.12.0
- **AndroidX AppCompat**: 1.6.1
- **Material Components**: 1.11.0
- **ConstraintLayout**: 2.1.4
- **CameraX**: 1.3.1 (for camera feed processing)
- **ONNX Runtime**: 1.17.0 (for AI model inference)
- **Google Play Services Location**: 21.1.0 (for GPS functionality)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/p-H-7/CampusGuard.git
   cd CampusGuard
   ```

2. **Open in Android Studio**
    - Launch Android Studio
    - Select `File > Open`
    - Navigate to the cloned `CampusGuard` directory
    - Click `OK` and wait for Gradle sync to complete

3. **Download AI Model (if not included)**
    - Place the ONNX model file in `app/src/main/assets/models/`
    - Model name: `threat_detection_model.onnx`
    - Model size: ~50MB (optimized for mobile)

4. **Configure Permissions**
    - The app requires the following permissions (already configured in `AndroidManifest.xml`):
        - `CAMERA`: For real-time video processing
        - `ACCESS_FINE_LOCATION`: For precise incident location
        - `ACCESS_COARSE_LOCATION`: For approximate location
        - `INTERNET`: For emergency alerts (optional)
        - `POST_NOTIFICATIONS`: For threat alerts

5. **Build the Project**
    - In Android Studio, select `Build > Make Project`
    - Or run: `./gradlew build` from the command line
    - Wait for the build to complete successfully

6. **Sync Gradle**
    - If not done automatically, click `File > Sync Project with Gradle Files`

### Building from Command Line

For those who prefer command-line builds:

```bash
# Linux/macOS
./gradlew assembleDebug

# Windows
gradlew.bat assembleDebug
```

The APK will be generated at: `app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 Run and Usage Instructions

### Running on Android Device (Recommended)

1. **Enable Developer Options** on your Android device:
    - Go to `Settings > About Phone`
    - Tap `Build Number` 7 times to enable developer mode
    - Go back to `Settings > System > Developer Options`
    - Enable `USB Debugging`

2. **Connect Device via USB**
    - Connect your Android device to your computer
    - Accept the USB debugging authorization prompt on your device

3. **Run the App**
    - In Android Studio, select your device from the device dropdown
    - Click the `Run` button (green play icon) or press `Shift + F10`
    - Wait for the app to install and launch

### Running on Emulator

1. **Create an Emulator**
    - In Android Studio, go to `Tools > Device Manager`
    - Click `Create Device`
    - Select a device definition (e.g., Pixel 6)
    - Choose a system image (API 34 recommended)
    - Finish setup

2. **Launch Emulator**
    - Select the emulator from the device dropdown
    - Click `Run`

**Note**: Emulator performance for AI inference may be slower than physical devices. For best results, test on a Snapdragon-powered Android device.

### Installing from APK

1. **Download the APK** from the releases section or build folder
2. **Enable Unknown Sources** on your Android device:
    - Go to `Settings > Security`
    - Enable `Install from Unknown Sources` or `Install Unknown Apps`
3. **Install APK**:
    - Transfer the APK to your device
    - Tap the APK file and follow installation prompts

### Using the Application

#### First Launch

1. **Grant Permissions**: When the app launches, grant Camera, Location, and Notification permissions
2. **Calibration**: The app will calibrate the AI model for your device (takes ~10 seconds)
3. **Home Screen**: You'll see the main dashboard with camera feed preview

#### Main Features

**1. Threat Detection Mode**
- Tap `Start Monitoring` to begin real-time threat detection
- Point camera at areas of interest
- App will automatically detect and highlight potential threats
- Confidence scores shown for each detection

**2. Alert System**
- When a threat is detected with >80% confidence:
    - Visual alert on screen
    - Audio alarm (can be muted in settings)
    - Automatic notification to configured recipients
    - GPS coordinates captured

**3. Emergency Response**
- Tap `Emergency Alert` to manually trigger alert
- Sends location and camera snapshot to authorities
- Records incident details for later review

**4. Settings**
- **Detection Sensitivity**: Adjust confidence threshold (default: 80%)
- **Alert Recipients**: Configure emergency contacts
- **Model Selection**: Choose between speed-optimized or accuracy-optimized models
- **Privacy Controls**: Toggle data retention settings

**5. History Log**
- View past detections and incidents
- Review timestamps, locations, and confidence scores
- Export reports for security analysis

#### Testing the Detection

For testing purposes without actual threats:
1. Use provided test images in `app/src/test/resources/`
2. Select `Test Mode` in settings
3. Load test images to verify detection accuracy

---

## 🧪 Tests and Testing Instructions

### Running Unit Tests

```bash
# Run all unit tests
./gradlew test

# Run specific test class
./gradlew test --tests "com.campusguard.ThreatDetectionTest"
```

### Running Instrumented Tests

```bash
# Run on connected device/emulator
./gradlew connectedAndroidTest

# Run specific instrumented test
./gradlew connectedAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.campusguard.CameraIntegrationTest
```

### Manual Testing Checklist

- [ ] Camera feed displays correctly
- [ ] AI model loads successfully
- [ ] Threat detection triggers alerts at appropriate confidence levels
- [ ] GPS location is accurately captured
- [ ] Notifications are sent when threats detected
- [ ] App works offline (no internet connection)
- [ ] Battery consumption is reasonable during monitoring
- [ ] Settings persist across app restarts
- [ ] Emergency alert button functions correctly
- [ ] History log displays past incidents

### Performance Benchmarks

Target metrics on Snapdragon 8 Gen 2 device:
- **Inference Time**: <100ms per frame
- **FPS**: 10-15 fps for real-time monitoring
- **Memory Usage**: <200MB
- **Battery Drain**: <5% per hour of active monitoring

---

## 📝 Additional Notes

### Architecture Overview

CampusGuard follows a modular architecture:

```
app/
├── src/main/
│   ├── java/com/campusguard/
│   │   ├── models/          # AI model integration
│   │   ├── camera/          # CameraX implementation
│   │   ├── detection/       # Threat detection logic
│   │   ├── alerts/          # Notification system
│   │   ├── location/        # GPS tracking
│   │   └── ui/              # User interface components
│   ├── assets/
│   │   └── models/          # ONNX AI models
│   └── res/                 # UI resources
```

### AI Model Details

- **Model Type**: YOLOv8 Nano optimized for mobile
- **Input Size**: 640x640 RGB
- **Output**: Bounding boxes, class labels, confidence scores
- **Classes Detected**: Weapons (knives, guns), suspicious objects, crowd anomalies
- **Quantization**: INT8 for faster inference on mobile
- **Training Dataset**: Custom dataset with campus-specific scenarios

### Known Limitations

- AI model accuracy may vary in low-light conditions
- Requires device with GPU or NPU for optimal performance
- Battery intensive during extended monitoring sessions
- Model may produce false positives in crowded scenarios (continuously improving)

### Future Enhancements

- Integration with campus security systems
- Multi-camera network coordination
- Advanced behavior analysis (running, fighting, etc.)
- Cloud backup of incident reports (optional)
- Integration with emergency services APIs
- Support for thermal cameras for night monitoring

### Privacy and Ethics

CampusGuard is designed with privacy as a priority:
- All video processing happens on-device
- No video data is stored or transmitted unless user explicitly shares during an emergency
- Detections are logged with metadata only (no images stored by default)
- Users have full control over data retention policies
- Compliant with campus privacy regulations

---

## 📚 References

### Technologies and Frameworks

1. **ONNX Runtime for Mobile**
    - https://onnxruntime.ai/docs/get-started/with-java.html
    - Used for efficient on-device AI inference

2. **Qualcomm Neural Processing SDK**
    - https://developer.qualcomm.com/software/qualcomm-neural-processing-sdk
    - Optimizes model performance on Snapdragon devices

3. **CameraX Library**
    - https://developer.android.com/training/camerax
    - Provides consistent camera API across Android devices

4. **YOLOv8 (Ultralytics)**
    - https://github.com/ultralytics/ultralytics
    - Base object detection model adapted for threat detection

### Research Papers

1. "Real-Time Object Detection with YOLO" - Redmon et al.
2. "Mobile Edge Computing for Computer Vision" - IEEE Transactions
3. "Privacy-Preserving Campus Security Systems" - ACM Conference on Security

### Datasets and Training

1. **COCO Dataset**: Base training for object detection
2. **Custom Campus Safety Dataset**: Augmented with scenario-specific data
3. **Synthetic Data Generation**: Using Unity for rare threat scenarios

### Android Development Resources

1. **Android Developers Guide**: https://developer.android.com/guide
2. **Kotlin Documentation**: https://kotlinlang.org/docs/home.html
3. **Material Design Guidelines**: https://material.io/design

### Tools Used

- **Android Studio**: IDE for development
- **Python (PyTorch/ONNX)**: For model training and conversion
- **Label Studio**: For dataset annotation
- **TensorBoard**: For monitoring training metrics
- **Git/GitHub**: Version control and collaboration

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Acknowledgments

- Qualcomm Snapdragon team for the Multiverse Hackathon opportunity
- Campus security personnel for domain expertise and testing feedback
- Open-source community for tools and libraries
- Beta testers from the campus community

---

## 📞 Contact and Support

For questions, issues, or contributions:

- **GitHub Issues**: [Report bugs or request features](https://github.com/p-H-7/CampusGuard/issues)
- **Email**: [your.email@example.com]
- **Documentation**: See `/docs` folder for detailed technical documentation

---

## 🚨 Disclaimer

CampusGuard is designed as a supplementary safety tool and should not replace professional security personnel or emergency services. Always report genuine threats to appropriate authorities. The AI model may produce false positives or miss threats. Use responsibly and in accordance with local laws and campus policies.

---

**Built with ❤️ for safer campuses everywhere**

**Powered by Qualcomm Snapdragon Technology**