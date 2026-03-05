import { NextRequest, NextResponse } from "next/server"
import sql from "@/lib/db"

async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(plain)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()

    const rows = await sql`SELECT id, password_hash, role FROM users WHERE login = ${login}`
    if (!rows.length) {
      return NextResponse.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 })
    }

    const user = rows[0]
    const computed = await sha256(password)

    console.log("[v0] computed:", computed, "stored:", user.password_hash, "match:", computed === user.password_hash)

    if (computed !== user.password_hash) {
      return NextResponse.json({ error: "Nieprawidłowy login lub hasło" }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set("session_id", String(user.id), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    })
    return res
  } catch (err) {
    console.error("[v0] Login error:", err)
    return NextResponse.json({ error: "Błąd serwera" }, { status: 500 })
  }
}
