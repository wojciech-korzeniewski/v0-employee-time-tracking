import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import sql from "@/lib/db"

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  const computed = await sha256(plain)
  return computed === hash
}

export async function hashPassword(plain: string): Promise<string> {
  return sha256(plain)
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
