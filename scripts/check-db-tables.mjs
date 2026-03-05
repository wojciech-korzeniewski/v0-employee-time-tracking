#!/usr/bin/env node
/**
 * Sprawdza, czy w bazie (DATABASE_URL) są wymagane tabele i użytkownik admin.
 * Uruchom: railway run node scripts/check-db-tables.mjs
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import { Client } from "pg"

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, "..", ".env.local")
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf8")
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+)\s*$/)
    if (m) process.env.DATABASE_URL = m[1].replace(/^["']|["']$/g, "").trim()
  }
}

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set.")
  process.exit(1)
}

const expectedTables = ["users", "contracts", "leave_types", "leave_allowances", "leave_requests", "schedule_entries", "settings"]

const client = new Client({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : undefined,
})
await client.connect()

console.log("Połączenie z bazą OK.\nTabele:")
const res = await client.query(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  ORDER BY table_name
`)
const tables = res.rows.map((r) => r.table_name)
for (const t of expectedTables) {
  const ok = tables.includes(t)
  console.log(ok ? "  ✓" : "  ✗ brak", t)
}

const missing = expectedTables.filter((t) => !tables.includes(t))
if (missing.length) {
  console.log("\nBrakujące tabele:", missing.join(", "))
  console.log("Uruchom migrację: node scripts/run-migrate.mjs (lub zrestartuj aplikację na Railway).")
}

const userRes = await client.query("SELECT id, login, role FROM users WHERE login = 'admin'")
if (userRes.rows.length) {
  console.log("\nUżytkownik admin: OK (id=%s, role=%s)", userRes.rows[0].id, userRes.rows[0].role)
} else {
  console.log("\nUżytkownik admin: BRAK – uruchom migrację lub scripts/run-fix-admin-password.mjs po seedzie.")
}

await client.end()
process.exit(missing.length ? 1 : 0)
