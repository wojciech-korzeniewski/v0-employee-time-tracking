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
  const { leave_type_id, total_days, year } = await req.json()

  await sql`
    INSERT INTO leave_allowances (user_id, leave_type_id, year, total_days, used_days, carried_over_days)
    VALUES (${userId}, ${parseInt(leave_type_id)}, ${parseInt(year)}, ${parseInt(total_days)}, 0, 0)
    ON CONFLICT (user_id, leave_type_id, year) DO UPDATE SET
      total_days = EXCLUDED.total_days,
      used_days = leave_allowances.used_days
  `

  return NextResponse.json({ ok: true })
}
