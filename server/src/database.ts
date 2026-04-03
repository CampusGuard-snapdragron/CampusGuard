import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function initDatabase() {
  const dataDir = process.env.DATA_DIR || './data'
  fs.mkdirSync(dataDir, { recursive: true })

  const dbPath = path.join(dataDir, 'campusguard.db')
  db = new Database(dbPath)

  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('temp_store = MEMORY')
  db.pragma('cache_size = -64000') // 64MB cache
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      deviceId TEXT NOT NULL,
      eventType TEXT NOT NULL,
      modelConfidence REAL DEFAULT 0,
      operatorVerdict TEXT DEFAULT 'AUTO',
      notes TEXT DEFAULT '',
      severity TEXT DEFAULT 'medium',
      imageBase64 TEXT DEFAULT '',
      llmAnalysis TEXT DEFAULT '',
      timestamp DATETIME DEFAULT (datetime('now')),
      acknowledged INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp);
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_device ON alerts(deviceId);
  `)

  // Default settings
  const defaults: Record<string, string> = {
    serverPort: '8787',
    serverToken: 'demo-token',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
    cloudProvider: 'none',
    cloudApiKey: '',
    autoAnalyze: 'true',
    cloudUrl: '',
  }

  const insertSetting = db.prepare(
    'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)'
  )
  for (const [key, value] of Object.entries(defaults)) {
    insertSetting.run(key, value)
  }
}

export function getDb(): Database.Database {
  return db
}
