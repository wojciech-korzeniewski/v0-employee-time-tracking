import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { leave_type_id, start_date, end_date, days_count, note } = await req.json()

  // Check allowance
  const year = new Date(start_date).getFullYear()
  const allowanceRows = await sql`
    SELECT * FROM leave_allowances
    WHERE user_id = ${session.id} AND leave_type_id = ${leave_type_id} AND year = ${year}
  `

  if (allowanceRows.length > 0) {
    const a = allowanceRows[0] as any
    const remaining = a.total_days + a.carried_over_days - a.used_days
    if (days_count > remaining) {
      return NextResponse.json({ error: `Niewystarczające saldo urlopowe (zostało ${remaining} dni)` }, { status: 400 })
    }
  }

  await sql`
    INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, days_count, note)
    VALUES (${session.id}, ${leave_type_id}, ${start_date}, ${end_date}, ${days_count}, ${note || null})
  `

  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.role === "employee") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id, status, manager_note } = await req.json()

  const rows = await sql`SELECT * FROM leave_requests WHERE id = ${id}`
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const request = rows[0] as any

  // For manager: can only approve/reject their direct reports
  if (session.role === "manager") {
    const userRows = await sql`SELECT manager_id FROM users WHERE id = ${request.user_id}`
    if (!userRows.length || userRows[0].manager_id !== session.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
  }

  await sql`
    UPDATE leave_requests
    SET status = ${status},
        manager_note = ${manager_note || null},
        approved_by = ${session.id},
        approved_at = NOW(),
        updated_at = NOW()
    WHERE id = ${id}
  `

  // If approved, update used_days in allowance
  if (status === "approved") {
    const year = new Date(request.start_date).getFullYear()
    await sql`
      UPDATE leave_allowances
      SET used_days = used_days + ${request.days_count}
      WHERE user_id = ${request.user_id}
        AND leave_type_id = ${request.leave_type_id}
        AND year = ${year}
    `
  }

  // If rejecting a previously approved request, return the days
  if (status === "rejected" && request.status === "approved") {
    const year = new Date(request.start_date).getFullYear()
    await sql`
      UPDATE leave_allowances
      SET used_days = GREATEST(0, used_days - ${request.days_count})
      WHERE user_id = ${request.user_id}
        AND leave_type_id = ${request.leave_type_id}
        AND year = ${year}
    `
  }

  return NextResponse.json({ ok: true })
}
