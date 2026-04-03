# 🖥️ Microsoft Store Listing — CampusGuard

Use these details to publish the Windows Desktop Monitoring Dashboard.

## 📝 App Descriptions

### **Product Name**
`CampusGuard`

### **Short Description** (100 characters max)
`Advanced campus security monitoring dashboard with real-time AI threat tracking.`

### **Description**
`CampusGuard Desktop is the centralized Command Center for the CampusGuard security ecosystem. It provides security personnel with a real-time view of all AI-detected threats reported from mobile devices.

Key Features:
• Real-time Incident Dashboard: Instantly see high-severity alerts from any CampusGuard mobile device.
• Instant Visual Verification: Each alert includes a captured image from the device at the moment of detection.
• AI Metadata: View confidence scores, event types (Weapon, Suspicious Activity, etc.), and operator verdicts.
• Historical Logging: Search and review past security incidents with timestamps and device IDs.
• On-Device AI: Fully compatible with local Ollama instances for advanced natural-language threat analysis.
• Privacy-Centric: Data stays within your configured ecosystem. No public cloud storage required.

Designed to work seamlessly with the CampusGuard Android app, providing a unified safety network for campuses, institutions, and large events.`

## 📂 Assets

### **Required Images**
| Image | Size | Location |
|---|---|---|
| **App Icon** | 256x256 | `windows-app/public/icon.png` (Already created) |
| **Store Logo** | 50x50 | Use the icon cropped |
| **Screenshot 1** | 1920x1080 | `PlayStoreAssets/tablet_dashboard.png` (High quality mockup) |
| **Screenshot 2** | 1920x1080 | `PlayStoreAssets/tablet_settings.png` (High quality mockup) |

## ⚙️ Submission Details

- **Category:** Utilities & Tools > Security
- **Privacy Policy:** `https://gist.github.com/Arya-Shidore/2e9644018531e6422c7bcf239ec6fd37`
- **Age Rating:** 12+ (due to security/weapon detection themes)
- **CORS Requirements:** Not applicable for desktop app communication.

## 🚀 Packaging Command
**YOU MUST RUN THIS ON A WINDOWS MACHINE:**
```bash
cd CampusGuard/windows-app
npm install
npm run package
```
This will generate an `.appx` or `.msix` file in the `release/` folder for upload to the Partner Center.
