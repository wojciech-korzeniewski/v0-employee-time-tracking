import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { name, is_paid, days_per_year, carries_over, max_carryover_days } = await req.json()

  await sql`
    INSERT INTO leave_types (name, is_paid, days_per_year, carries_over, max_carryover_days)
    VALUES (
      ${name},
      ${is_paid},
      ${days_per_year ? parseInt(days_per_year) : null},
      ${carries_over},
      ${parseInt(max_carryover_days) || 0}
    )
  `

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get("id") || "0")

  // Check if any requests use this type
  const inUse = await sql`SELECT COUNT(*) as count FROM leave_requests WHERE leave_type_id = ${id}`
  if (parseInt((inUse[0] as any).count) > 0) {
    return NextResponse.json({ error: "Nie można usunąć - typ jest w użyciu" }, { status: 400 })
  }

  await sql`DELETE FROM leave_types WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
