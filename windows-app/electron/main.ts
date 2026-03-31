import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'
import * as api from './api'

let mainWindow: BrowserWindow | null = null

// ---- Local settings JSON ----

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json')

const defaultSettings: Record<string, string> = {
  cloudUrl: '',
  serverToken: 'demo-token',
  ollamaUrl: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  cloudProvider: 'none',
  cloudApiKey: '',
  autoAnalyze: 'true',
}

function loadSettings(): Record<string, string> {
  try {
    const raw = fs.readFileSync(settingsPath(), 'utf-8')
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return { ...defaultSettings }
  }
}

function saveSettings(settings: Record<string, string>) {
  fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2))
}

function getSetting(key: string): string {
  const settings = loadSettings()
  return settings[key] ?? defaultSettings[key] ?? ''
}

function setSetting(key: string, value: string) {
  const settings = loadSettings()
  settings[key] = value
  saveSettings(settings)
}

// ---- Window ----

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'CampusGuard',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#030712',
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ---- IPC Handlers ----

ipcMain.handle('alerts:getAll', async (_event, opts) => {
  return api.getAlerts(opts)
})

ipcMain.handle('alerts:getById', async (_event, id: number) => {
  return api.getAlertById(id)
})

ipcMain.handle('alerts:getStats', async () => {
  return api.getStats()
})

ipcMain.handle('alerts:delete', async (_event, id: number) => {
  return api.deleteAlert(id)
})

ipcMain.handle('alerts:addLocal', async (_event, alert: any) => {
  return api.postAlert(alert)
})

ipcMain.handle('settings:get', async () => {
  return loadSettings()
})

ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
  setSetting(key, value)
  // Re-configure API client when cloud settings change
  if (key === 'cloudUrl' || key === 'serverToken') {
    const settings = loadSettings()
    api.configure(settings.cloudUrl, settings.serverToken)
  }
  return { success: true }
})

ipcMain.handle('llm:analyze', async (_event, alertData: any) => {
  const settings = loadSettings()
  const ollamaUrl = settings.ollamaUrl || 'http://localhost:11434'
  const ollamaModel = settings.ollamaModel || 'llama3.2'
  const cloudApiKey = settings.cloudApiKey || ''
  const cloudProvider = settings.cloudProvider || 'none'

  const prompt = buildThreatPrompt(alertData)

  // Try Ollama first
  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ollamaModel,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 500 }
      })
    })
    if (response.ok) {
      const data = await response.json()
      return { source: 'ollama', analysis: data.response }
    }
  } catch {
    // Ollama not available, try cloud fallback
  }

  // Cloud fallback
  if (cloudApiKey && cloudProvider !== 'none') {
    try {
      if (cloudProvider === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cloudApiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are a campus security analyst AI.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500,
            temperature: 0.3
          })
        })
        if (response.ok) {
          const data = await response.json()
          return { source: 'openai', analysis: data.choices[0].message.content }
        }
      }
    } catch {
      // Cloud also failed
    }
  }

  return { source: 'none', analysis: 'LLM analysis unavailable. Configure Ollama or a cloud API key in Settings.' }
})

ipcMain.handle('llm:checkOllama', async () => {
  const settings = loadSettings()
  const url = settings.ollamaUrl || 'http://localhost:11434'
  try {
    const response = await fetch(`${url}/api/tags`)
    if (response.ok) {
      const data = await response.json()
      return { connected: true, models: data.models?.map((m: any) => m.name) || [] }
    }
  } catch {
    // not available
  }
  return { connected: false, models: [] }
})

function buildThreatPrompt(alertData: any): string {
  return `You are CampusGuard AI, a campus security threat analyst. Analyze this security alert and provide a brief threat assessment.

ALERT DATA:
- Event Type: ${alertData.eventType}
- Device ID: ${alertData.deviceId}
- Model Confidence: ${((alertData.modelConfidence || 0) * 100).toFixed(1)}%
- Operator Verdict: ${alertData.operatorVerdict}
- Timestamp: ${alertData.timestamp}
- Notes: ${alertData.notes || 'None'}

Provide:
1. SEVERITY: (critical / high / medium / low)
2. ASSESSMENT: Brief analysis of the threat (2-3 sentences)
3. RECOMMENDED ACTIONS: 2-3 specific actions to take
4. CORRELATION: Any patterns this might relate to (e.g., repeated alerts from same device)

Be concise and actionable. This is for campus security personnel.`
}

// ---- Polling for new alerts ----

let lastAlertId = 0
let pollInterval: ReturnType<typeof setInterval> | null = null

async function pollForNewAlerts() {
  try {
    const alerts = await api.getAlerts({ limit: 1 })
    if (Array.isArray(alerts) && alerts.length > 0) {
      const latest = alerts[0]
      if (latest.id > lastAlertId) {
        if (lastAlertId > 0 && mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('alert:new', latest)
        }
        lastAlertId = latest.id
      }
    }
  } catch {
    // Server unreachable, skip this poll
  }
}

function startPolling() {
  if (pollInterval) return
  pollInterval = setInterval(pollForNewAlerts, 5000)
  // Initial fetch to set lastAlertId baseline
  pollForNewAlerts()
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

// ---- App Lifecycle ----

app.whenReady().then(async () => {
  const settings = loadSettings()
  // Persist defaults if file didn't exist
  saveSettings(settings)
  api.configure(settings.cloudUrl, settings.serverToken)
  createWindow()
  startPolling()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopPolling()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
