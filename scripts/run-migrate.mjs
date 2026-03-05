#!/usr/bin/env node
/**
 * Runs scripts/migrate.sql against DATABASE_URL.
 * Usage: railway run node scripts/run-migrate.mjs   (on Railway)
 *        node scripts/run-migrate.mjs              (local, with .env.local or DATABASE_URL)
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

const client = new Client({ connectionString: DATABASE_URL, ssl: DATABASE_URL.includes("railway") ? { rejectUnauthorized: false } : undefined })
await client.connect()

const migratePath = resolve(__dirname, "migrate.sql")
const fullSql = readFileSync(migratePath, "utf8")

const statements = fullSql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter((s) => s.length > 0)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i] + ";"
  try {
    await client.query(stmt)
    console.log("OK:", stmt.slice(0, 50).replace(/\n/g, " ") + "...")
  } catch (err) {
    if (err.code === "42P07") {
      console.log("Skip (already exists):", stmt.slice(0, 50).replace(/\n/g, " ") + "...")
    } else {
      console.error("Error at statement", i + 1, ":", err.message)
      console.error(stmt.slice(0, 200))
      await client.end()
      process.exit(1)
    }
  }
}

console.log("Migration finished.")
await client.end()
process.exit(0)
