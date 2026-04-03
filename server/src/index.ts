import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import pino from 'pino'
import path from 'path'
import { initDatabase, getDb } from './database'

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { colorize: true }
  }
})

const app = express()

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, 
}))

// CORS - Restrict to production domain and local development
const allowedOrigins = [
  'https://campusguard-server-production.up.railway.app',
  'http://localhost:5173', // Vite dev
  'http://localhost:8787'  // Local server
]

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  }
}))

app.use(express.json({ limit: '10mb' }))

// Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' }
})

const alertLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Alert rate limit exceeded. Please wait.' }
})

// Logging middleware
app.use((req, _res, next) => {
  logger.info({ method: req.method, url: req.url, ip: req.ip }, 'Incoming request')
  next()
})

const expectedToken = process.env.CAMPUSGUARD_TOKEN || '8bb29658ad048ef57e46d5665bf6c9014aa9f6d62c776e06261a8ef8541caa24'

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = req.headers['x-campusguard-token']
  if (token !== expectedToken) {
    logger.warn({ ip: req.ip, token_provided: token }, 'Unauthorized access attempt')
    res.status(401).json({ error: 'Invalid token' })
    return
  }
  next()
}

// --- STATIC DASHBOARD ---
const dashboardPath = path.join(__dirname, '../public/dashboard')
app.use('/dashboard', express.static(dashboardPath))

// Root
app.get('/', (_req, res) => {
  res.json({ 
    status: 'ok', 
    app: 'CampusGuard Server', 
    version: '1.1.0 (Web Dashboard Enhanced)',
    dashboard: '/dashboard'
  })
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// --- API ROUTES ---

app.post('/alert', alertLimiter, authMiddleware, (req, res) => {
  const db = getDb()
  const { deviceId, eventType, modelConfidence, operatorVerdict, notes, imageBase64, llmAnalysis } = req.body

  if (!deviceId || !eventType) {
    res.status(400).json({ error: 'Missing deviceId or eventType' })
    return
  }

  let severity = 'medium'
  if (operatorVerdict === 'YES') severity = 'high'
  if (eventType.toLowerCase().includes('knife') || eventType.toLowerCase().includes('weapon')) severity = 'critical'

  const stmt = db.prepare(`
    INSERT INTO alerts (deviceId, eventType, modelConfidence, operatorVerdict, notes, severity, imageBase64, llmAnalysis, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const result = stmt.run(
    deviceId,
    eventType,
    modelConfidence || 0,
    operatorVerdict || 'AUTO',
    notes || '',
    severity,
    imageBase64 || '',
    llmAnalysis || ''
  )

  res.json({ success: true, alertId: result.lastInsertRowid })
})

app.get('/alerts', generalLimiter, authMiddleware, (req, res) => {
  const db = getDb()
  const limit = parseInt(req.query.limit as string) || 100
  const offset = parseInt(req.query.offset as string) || 0
  const alerts = db.prepare('SELECT * FROM alerts ORDER BY timestamp DESC LIMIT ? OFFSET ?').all(limit, offset)
  res.json(alerts)
})

app.get('/alerts/stats', generalLimiter, authMiddleware, (_req, res) => {
  const db = getDb()
  const total = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as any
  const today = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE timestamp > datetime('now', '-1 day')").get() as any
  const highSeverity = db.prepare("SELECT COUNT(*) as count FROM alerts WHERE severity = 'high'").get() as any
  const byType = db.prepare('SELECT eventType, COUNT(*) as count FROM alerts GROUP BY eventType ORDER BY count DESC LIMIT 10').all()
  const byHour = db.prepare("SELECT strftime('%H', timestamp) as hour, COUNT(*) as count FROM alerts WHERE timestamp > datetime('now', '-1 day') GROUP BY hour ORDER BY hour").all()
  const recentDevices = db.prepare('SELECT DISTINCT deviceId FROM alerts ORDER BY timestamp DESC LIMIT 20').all()

  res.json({
    total: total.count,
    today: today.count,
    highSeverity: highSeverity.count,
    byType,
    byHour,
    activeDevices: recentDevices.length,
  })
})

app.delete('/alerts/:id', authMiddleware, (req, res) => {
  const db = getDb()
  db.prepare('DELETE FROM alerts WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// SPA Fallback
app.get('/dashboard/*', (_req, res) => {
  res.sendFile(path.join(dashboardPath, 'index.html'))
})

// Start
initDatabase()
const port = parseInt(process.env.PORT || '8787')
app.listen(port, '0.0.0.0', () => {
  console.log(`CampusGuard server listening on port ${port}`)
})
