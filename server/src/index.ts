import express from 'express'
import cors from 'cors'
import { initDatabase, getDb } from './database'

const app = express()
app.use(cors())
app.use(express.json({ limit: '10mb' }))

const expectedToken = process.env.CAMPUSGUARD_TOKEN || 'demo-token'

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-campusguard-token']
  if (token !== expectedToken) {
    res.status(401).json({ error: 'Invalid token' })
    return
  }
  next()
}

// Health check (no auth)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', app: 'CampusGuard Server', version: '1.0.0' })
})

// Receive alert from Android phones
app.post('/alert', authMiddleware, (req, res) => {
  const db = getDb()
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

  res.json({ success: true, alertId: result.lastInsertRowid })
})

// List alerts with pagination
app.get('/alerts', authMiddleware, (req, res) => {
  const db = getDb()
  const limit = parseInt(req.query.limit as string) || 100
  const offset = parseInt(req.query.offset as string) || 0
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limit, offset)
  res.json(alerts)
})

// Alert stats
app.get('/alerts/stats', authMiddleware, (_req, res) => {
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

  res.json({
    total: total.count,
    today: today.count,
    highSeverity: highSeverity.count,
    byType,
    byHour,
    activeDevices: recentDevices.length,
  })
})

// Single alert
app.get('/alerts/:id', authMiddleware, (req, res) => {
  const db = getDb()
  const alert = db.prepare('SELECT * FROM alerts WHERE id = ?').get(req.params.id)
  if (!alert) {
    res.status(404).json({ error: 'Alert not found' })
    return
  }
  res.json(alert)
})

// Delete alert
app.delete('/alerts/:id', authMiddleware, (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Start
initDatabase()
const port = parseInt(process.env.PORT || '8787')
app.listen(port, '0.0.0.0', () => {
  console.log(`CampusGuard server listening on port ${port}`)
})
