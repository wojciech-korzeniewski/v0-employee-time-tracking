import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const userId = parseInt(id)

  // HR can edit anyone; users can edit their own basic info
  if (session.role !== "hr" && session.id !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json()
  const { full_name, email, phone, address, birth_date, pesel, nip, bank_account, role, manager_id } = body

  const mgr = manager_id && manager_id !== "none" ? parseInt(manager_id) : null

  await sql`
    UPDATE users SET
      full_name = ${full_name},
      email = ${email || null},
      phone = ${phone || null},
      address = ${address || null},
      birth_date = ${birth_date || null},
      pesel = ${pesel || null},
      nip = ${nip || null},
      bank_account = ${bank_account || null},
      role = ${session.role === "hr" ? role : undefined},
      manager_id = ${session.role === "hr" ? mgr : undefined},
      updated_at = NOW()
    WHERE id = ${userId}
  `

  return NextResponse.json({ ok: true })
}
