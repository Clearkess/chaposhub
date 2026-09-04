import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const DATA_DIR = process.env.DB_DIR || path.resolve(__dirname, '../../data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'chaposhub.sqlite3')

export const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

export function runMigrations() {
  const schemaPath = path.resolve(__dirname, 'schema.sql')
  const schema = fs.readFileSync(schemaPath, 'utf-8')
  db.exec(schema)
  applyColumnMigrations()
}

// `schema.sql` is blindly re-executed on every startup, which is fine for
// brand-new tables (`CREATE TABLE IF NOT EXISTS`) but NOT for adding new
// COLUMNS to a table that already exists in an already-created local dev
// database file (SQLite has no `ADD COLUMN IF NOT EXISTS`). This runs any
// pending `ALTER TABLE ... ADD COLUMN` migrations, guarded by a
// `PRAGMA table_info` existence check so it's safe to run on every startup
// (both against a brand-new DB, where schema.sql's CREATE TABLE already
// included the column, and an older DB file missing it).
function applyColumnMigrations() {
  const columnMigrations: { table: string; column: string; ddl: string }[] = [
    { table: 'users', column: 'whatsapp', ddl: 'ALTER TABLE users ADD COLUMN whatsapp TEXT' },
    { table: 'users', column: 'is_vendor', ddl: 'ALTER TABLE users ADD COLUMN is_vendor INTEGER NOT NULL DEFAULT 0' }
  ]
  for (const m of columnMigrations) {
    const cols = db.prepare(`PRAGMA table_info(${m.table})`).all() as { name: string }[]
    const exists = cols.some((c) => c.name === m.column)
    if (!exists) db.exec(m.ddl)
  }
}

runMigrations()

export default db
