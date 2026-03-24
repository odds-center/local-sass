import Database from 'better-sqlite3'
import { app } from 'electron'
import path from 'path'
import fs from 'fs'

let db: Database.Database

export function getDb(): Database.Database {
  if (!db) throw new Error('DB not initialized. Call initDb() first.')
  return db
}

export function initDb(): void {
  const userDataPath = app.getPath('userData')
  const dbPath = path.join(userDataPath, 'app.db')

  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations()
}

function runMigrations(): void {
  const migrationsDir = path.join(__dirname, 'migrations')

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      run_at TEXT NOT NULL
    )
  `)

  const applied = new Set(
    (db.prepare('SELECT filename FROM _migrations').all() as { filename: string }[]).map(
      (r) => r.filename
    )
  )

  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')
    db.exec(sql)
    db.prepare('INSERT INTO _migrations (filename, run_at) VALUES (?, ?)').run(
      file,
      new Date().toISOString()
    )
    console.log(`[DB] Migration applied: ${file}`)
  }
}
