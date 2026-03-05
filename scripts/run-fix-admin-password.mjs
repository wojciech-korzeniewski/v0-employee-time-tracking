#!/usr/bin/env node
/**
 * Applies the admin password fix (64-char SHA-256 hash) to the database.
 * Requires DATABASE_URL in the environment (e.g. from .env.local).
 */
import { neon } from "@neondatabase/serverless"

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set. Set it or run from the project root with .env.local loaded.")
  process.exit(1)
}

const sql = neon(DATABASE_URL)
const HASH = "240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9"

const result = await sql`UPDATE users SET password_hash = ${HASH} WHERE login = 'admin'`
console.log("Updated admin user password_hash to 64-char SHA-256 of 'admin123'. Rows affected:", result?.length ?? (Array.isArray(result) ? result.length : "see above"))
process.exit(0)
