import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { hashPassword } from "@/lib/auth"
import sql from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { login, password, full_name, email, phone, role, manager_id } = await req.json()

  const existing = await sql`SELECT id FROM users WHERE login = ${login}`
  if (existing.length) {
    return NextResponse.json({ error: "Login już istnieje" }, { status: 400 })
  }

  const hash = await hashPassword(password)
  const mgr = manager_id && manager_id !== "none" ? parseInt(manager_id) : null

  await sql`
    INSERT INTO users (login, password_hash, role, full_name, email, phone, manager_id)
    VALUES (${login}, ${hash}, ${role}, ${full_name}, ${email || null}, ${phone || null}, ${mgr})
  `

  return NextResponse.json({ ok: true })
}
