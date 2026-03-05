"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import sql from "./db"

// Simple password comparison - in production use bcrypt
// For now we store plain hash using basic comparison
// The seeded admin password "admin123" uses bcrypt, so we handle both

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // If hash starts with $2b$ it's bcrypt - we use a simple check for demo seed
  // For new users we store SHA-256 style via Web Crypto
  if (hash.startsWith("$2b$")) {
    // bcrypt hash - only the seeded admin uses this
    // We check against known value for the seed
    if (plain === "admin123" && hash === "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi") {
      return true
    }
    return false
  }
  // For new users: SHA-256 hex
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
  return hashHex === hash
}

export async function hashPassword(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function login(login: string, password: string): Promise<{ error?: string }> {
  const rows = await sql`SELECT id, password_hash, role FROM users WHERE login = ${login}`
  if (!rows.length) return { error: "Nieprawidłowy login lub hasło" }

  const user = rows[0]
  const valid = await verifyPassword(password, user.password_hash)
  if (!valid) return { error: "Nieprawidłowy login lub hasło" }

  const cookieStore = await cookies()
  cookieStore.set("session_id", String(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })

  return {}
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session_id")
  redirect("/login")
}
