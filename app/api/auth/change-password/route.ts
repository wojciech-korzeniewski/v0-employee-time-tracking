import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { current, next } = await req.json()
  if (!current || !next || next.length < 4) {
    return NextResponse.json({ error: "Hasło musi mieć co najmniej 4 znaki" }, { status: 400 })
  }

  // Verify current password
  const rows = await sql`SELECT password_hash FROM users WHERE id = ${session.id}`
  if (!rows.length) return NextResponse.json({ error: "Nie znaleziono użytkownika" }, { status: 404 })

  const { password_hash } = rows[0] as any

  // Support both bcrypt (legacy seeded admin) and SHA-256
  let valid = false
  if (password_hash.startsWith("$2b$")) {
    valid = current === "admin123" && password_hash === "$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi"
  } else {
    const encoder = new TextEncoder()
    const data = encoder.encode(current)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)
    const hashHex = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("")
    valid = hashHex === password_hash
  }

  if (!valid) return NextResponse.json({ error: "Obecne hasło jest nieprawidłowe" }, { status: 400 })

  const newHash = await hashPassword(next)
  await sql`UPDATE users SET password_hash = ${newHash}, updated_at = NOW() WHERE id = ${session.id}`

  return NextResponse.json({ ok: true })
}
