#!/usr/bin/env node
/**
 * Applies the admin password fix (64-char SHA-256 hash) to the database.
 * Loads DATABASE_URL from .env.local if present.
 */
import { readFileSync, existsSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"
import postgres from "postgres"

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
  console.error("DATABASE_URL is not set. Set it or run from the project root with .env.local loaded.")
  process.exit(1)
}

const sql = postgres(DATABASE_URL, { max: 1 })
const HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"

const result = await sql`UPDATE users SET password_hash = ${HASH} WHERE login = 'admin'`
console.log("Updated admin user password_hash to 64-char SHA-256 of 'admin123'. Rows affected:", result?.length ?? (Array.isArray(result) ? result.length : "see above"))
process.exit(0)
