import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"
import { getMonthsWorkedInYear, getEffectiveTotalDays } from "@/lib/leave-utils"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userIdParam = searchParams.get("userId")
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  const userId = userIdParam ? parseInt(userIdParam, 10) : session.id
  if (userId !== session.id) {
    if (session.role !== "manager" && session.role !== "hr") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (session.role === "manager") {
      const userRows = await sql`SELECT manager_id FROM users WHERE id = ${userId}`
      if (!userRows.length || (userRows[0] as any).manager_id !== session.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
    }
  }

  if (!start || !end) {
    return NextResponse.json({ error: "Missing start or end date" }, { status: 400 })
  }

  // Team overview: no userId = all approved leaves for team in range (manager/hr only)
  if ((userIdParam === null || userIdParam === "") && (session.role === "manager" || session.role === "hr")) {
    let allowedIds: number[]
    if (session.role === "hr") {
      const all = await sql`SELECT id FROM users`
      allowedIds = (all as { id: number }[]).map((r) => r.id)
    } else {
      const rows = await sql`
        SELECT id FROM users WHERE manager_id = ${session.id} OR id = ${session.id}
      `
      allowedIds = (rows as { id: number }[]).map((r) => r.id)
    }
    if (allowedIds.length === 0) {
      return NextResponse.json([])
    }
    const rows = await sql`
      SELECT id, user_id, start_date, end_date, leave_type_id
      FROM leave_requests
      WHERE user_id IN (${sql(allowedIds)})
        AND status = 'approved'
        AND start_date <= ${end}
        AND end_date >= ${start}
      ORDER BY user_id, start_date
    `
    return NextResponse.json(rows)
  }

  const rows = await sql`
    SELECT id, start_date, end_date, leave_type_id
    FROM leave_requests
    WHERE user_id = ${userId}
      AND status = 'approved'
      AND start_date <= ${end}
      AND end_date >= ${start}
    ORDER BY start_date
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { leave_type_id, start_date, end_date, days_count, note } = await req.json()

  // Check allowance (with accrual: effective total for monthly)
  const year = new Date(start_date).getFullYear()
  const allowanceRows = await sql`
    SELECT la.*, lt.accrual_type, lt.days_per_year
    FROM leave_allowances la
    JOIN leave_types lt ON lt.id = la.leave_type_id
    WHERE la.user_id = ${session.id} AND la.leave_type_id = ${leave_type_id} AND la.year = ${year}
  `
  if (allowanceRows.length > 0) {
    const a = allowanceRows[0] as any
    const contractRows = await sql`
      SELECT start_date, end_date FROM contracts
      WHERE user_id = ${session.id} AND start_date <= ${year + "-12-31"}
      AND (end_date IS NULL OR end_date >= ${year + "-01-01"})
      ORDER BY start_date DESC LIMIT 1
    `
    const contract = contractRows.length ? (contractRows[0] as { start_date: string; end_date: string | null }) : null
    const asOf = new Date().toISOString().split("T")[0]
    const monthsWorked = getMonthsWorkedInYear(contract, year, asOf)
    const effectiveTotal = getEffectiveTotalDays(
      Number(a.total_days),
      a.accrual_type ?? "upfront",
      a.annual_days != null ? Number(a.annual_days) : null,
      a.days_per_year != null ? Number(a.days_per_year) : null,
      monthsWorked
    )
    const remaining = effectiveTotal + Number(a.carried_over_days) - Number(a.used_days)
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

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 })

  const rows = await sql`SELECT * FROM leave_requests WHERE id = ${parseInt(id, 10)}`
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const request = rows[0] as { user_id: number; status: string; leave_type_id: number; start_date: string; days_count: number }

  if (request.user_id !== session.id) {
    return NextResponse.json({ error: "Możesz usunąć tylko własny wniosek" }, { status: 403 })
  }

  if (request.status === "approved") {
    const year = new Date(request.start_date).getFullYear()
    await sql`
      UPDATE leave_allowances
      SET used_days = GREATEST(0, used_days - ${request.days_count})
      WHERE user_id = ${request.user_id}
        AND leave_type_id = ${request.leave_type_id}
        AND year = ${year}
    `
  }

  await sql`DELETE FROM leave_requests WHERE id = ${parseInt(id, 10)}`

  return NextResponse.json({ ok: true })
}
