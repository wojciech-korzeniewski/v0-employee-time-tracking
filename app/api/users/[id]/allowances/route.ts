import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const userId = parseInt(id)
  const body = await req.json()
  const leave_type_id = parseInt(body.leave_type_id)
  const year = parseInt(body.year)
  const total_days = body.total_days != null ? parseInt(body.total_days, 10) : 0
  const annual_days = body.annual_days != null && body.annual_days !== "" ? parseFloat(body.annual_days) : null

  await sql`
    INSERT INTO leave_allowances (user_id, leave_type_id, year, total_days, used_days, carried_over_days, annual_days)
    VALUES (${userId}, ${leave_type_id}, ${year}, ${total_days}, 0, 0, ${annual_days})
    ON CONFLICT (user_id, leave_type_id, year) DO UPDATE SET
      total_days = EXCLUDED.total_days,
      annual_days = EXCLUDED.annual_days,
      used_days = leave_allowances.used_days
  `

  return NextResponse.json({ ok: true })
}
