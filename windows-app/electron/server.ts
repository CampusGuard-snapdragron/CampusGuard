import express from 'express'
import cors from 'cors'
import { getDb } from './database'
import type { Server } from 'http'

let server: Server | null = null

export function startServer(onNewAlert: (alert: any) => void) {
  const db = getDb()
  const portRow = db.prepare("SELECT value FROM settings WHERE key = 'serverPort'").get() as any
  const tokenRow = db.prepare("SELECT value FROM settings WHERE key = 'serverToken'").get() as any
  const port = parseInt(portRow?.value || '8787')
  const expectedToken = tokenRow?.value || 'demo-token'

  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '10mb' }))

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', app: 'CampusGuard Desktop', version: '1.0.0' })
  })

  // Receive alert from Android phones
  app.post('/alert', (req, res) => {
    const token = req.headers['x-campusguard-token']
    if (token !== expectedToken) {
      res.status(401).json({ error: 'Invalid token' })
      return
    }

    const { deviceId, eventType, modelConfidence, operatorVerdict, notes, imageBase64 } = req.body

    if (!deviceId || !eventType) {
      res.status(400).json({ error: 'Missing deviceId or eventType' })
      return
    }

    // Determine severity
    let severity = 'medium'
    if (operatorVerdict === 'YES') severity = 'high'
    if (eventType.toLowerCase().includes('knife') || eventType.toLowerCase().includes('weapon')) severity = 'critical'
    if (operatorVerdict === 'MAYBE') severity = 'medium'

    const stmt = db.prepare(`
      INSERT INTO alerts (deviceId, eventType, modelConfidence, operatorVerdict, notes, severity, imageBase64, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    const result = stmt.run(
      deviceId,
      eventType,
      modelConfidence || 0,
      operatorVerdict || 'AUTO',
      notes || '',
      severity,
      imageBase64 || ''
    )

    const newAlert = {
      id: result.lastInsertRowid,
      deviceId,
      eventType,
      modelConfidence,
      operatorVerdict,
      notes,
      severity,
      timestamp: new Date().toISOString(),
    }

    // Notify the renderer
    onNewAlert(newAlert)

    res.json({ success: true, alertId: result.lastInsertRowid })
  })

  // Get alerts (for external clients)
  app.get('/alerts', (_req, res) => {
    const alerts = db.prepare('SELECT id, deviceId, eventType, modelConfidence, operatorVerdict, severity, timestamp FROM alerts ORDER BY timestamp DESC LIMIT 100').all()
    res.json(alerts)
  })

  server = app.listen(port, '0.0.0.0', () => {
    console.log(`CampusGuard server listening on port ${port}`)
  })
}

export function stopServer() {
  if (server) {
    server.close()
    server = null
  }
}
