import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'
import { initDatabase, getDb } from './database'
import { startServer, stopServer } from './server'

let mainWindow: BrowserWindow | null = null

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

ipcMain.handle('alerts:getAll', async (_event, { limit, offset } = {}) => {
  const db = getDb()
  const l = limit || 100
  const o = offset || 0
  return db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(l, o)
})

ipcMain.handle('alerts:getById', async (_event, id: number) => {
  const db = getDb()
  return db.prepare('SELECT * FROM alerts WHERE id = ?').get(id)
})

ipcMain.handle('alerts:getStats', async () => {
  const db = getDb()
  const total = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any
  const today = db.prepare(
    "SELECT COUNT(*) as count FROM alerts WHERE timestamp > datetime('now', '-1 day')"
  ).get() as any
  const highSeverity = db.prepare(
    "SELECT COUNT(*) as count FROM alerts WHERE severity = 'high'"
  ).get() as any
  const byType = db.prepare(
    'SELECT eventType, COUNT(*) as count FROM alerts GROUP BY eventType ORDER BY count DESC LIMIT 10'
  ).all()
  const byHour = db.prepare(
    "SELECT strftime('%H', timestamp) as hour, COUNT(*) as count FROM alerts WHERE timestamp > datetime('now', '-1 day') GROUP BY hour ORDER BY hour"
  ).all()
  const recentDevices = db.prepare(
    'SELECT DISTINCT deviceId FROM alerts ORDER BY timestamp DESC LIMIT 20'
  ).all()

  return {
    total: total.count,
    today: today.count,
    highSeverity: highSeverity.count,
    byType,
    byHour,
    activeDevices: recentDevices.length,
  }
})

ipcMain.handle('alerts:delete', async (_event, id: number) => {
  const db = getDb()
  db.prepare('DELETE FROM alerts WHERE id = ?').run(id)
  return { success: true }
})

ipcMain.handle('alerts:addLocal', async (_event, alert: any) => {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO alerts (deviceId, eventType, modelConfidence, operatorVerdict, notes, severity, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `)
  const result = stmt.run(
    alert.deviceId || 'local-webcam',
    alert.eventType,
    alert.modelConfidence || 0,
    alert.operatorVerdict || 'AUTO',
    alert.notes || '',
    alert.severity || 'medium'
  )
  return { id: result.lastInsertRowid }
})

ipcMain.handle('settings:get', async () => {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as any[]
  const settings: Record<string, string> = {}
  for (const row of rows) {
    settings[row.key] = row.value
  }
  return settings
})

ipcMain.handle('settings:set', async (_event, key: string, value: string) => {
  const db = getDb()
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  return { success: true }
})

ipcMain.handle('llm:analyze', async (_event, alertData: any) => {
  const db = getDb()
  const settings = db.prepare('SELECT key, value FROM settings').all() as any[]
  const config: Record<string, string> = {}
  for (const row of settings) config[row.key] = row.value

  const ollamaUrl = config['ollamaUrl'] || 'http://localhost:11434'
  const ollamaModel = config['ollamaModel'] || 'llama3.2'
  const cloudApiKey = config['cloudApiKey'] || ''
  const cloudProvider = config['cloudProvider'] || 'none'

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
  const db = getDb()
  const row = db.prepare("SELECT value FROM settings WHERE key = 'ollamaUrl'").get() as any
  const url = row?.value || 'http://localhost:11434'
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

// Broadcast new alerts to renderer
function notifyNewAlert(alert: any) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('alert:new', alert)
  }
}

// Export for server to use
export { notifyNewAlert }

// ---- App Lifecycle ----

app.whenReady().then(async () => {
  initDatabase()
  startServer(notifyNewAlert)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopServer()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
