import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userIdsParam = searchParams.get("userIds")
  const start = searchParams.get("start")
  const end = searchParams.get("end")

  // Team overview: multiple userIds (only manager/hr)
  if (userIdsParam && (session.role === "manager" || session.role === "hr")) {
    if (!start || !end) {
      return NextResponse.json({ error: "Missing start or end" }, { status: 400 })
    }
    const requestedIds = userIdsParam.split(",").map((s) => parseInt(s.trim(), 10)).filter(Boolean)
    if (requestedIds.length === 0) {
      return NextResponse.json([])
    }
    let allowedIds: number[]
    if (session.role === "hr") {
      allowedIds = requestedIds
    } else {
      const rows = await sql`
        SELECT id FROM users WHERE manager_id = ${session.id} OR id = ${session.id}
      `
      const managerTeamIds = (rows as { id: number }[]).map((r) => r.id)
      allowedIds = requestedIds.filter((id) => managerTeamIds.includes(id))
    }
    if (allowedIds.length === 0) {
      return NextResponse.json([])
    }
    const rows = await sql`
      SELECT id, user_id, work_date::text AS work_date, start_time::text AS start_time, end_time::text AS end_time, break_minutes, note, created_at, updated_at
      FROM schedule_entries
      WHERE user_id IN (${sql(allowedIds)})
        AND work_date >= ${start}
        AND work_date <= ${end}
      ORDER BY user_id, work_date
    `
    return NextResponse.json(rows)
  }

  const userId = parseInt(searchParams.get("userId") || String(session.id))

  // Only allow seeing others if manager/hr
  if (userId !== session.id && session.role === "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const rows = await sql`
    SELECT id, user_id, work_date::text AS work_date, start_time::text AS start_time, end_time::text AS end_time, break_minutes, note, created_at, updated_at
    FROM schedule_entries
    WHERE user_id = ${userId}
      AND work_date >= ${start}
      AND work_date <= ${end}
    ORDER BY work_date
  `
  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const { userId, work_date, start_time, end_time, break_minutes, note } = body

  const targetUserId = userId || session.id
  if (targetUserId !== session.id && session.role === "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await sql`
    INSERT INTO schedule_entries (user_id, work_date, start_time, end_time, break_minutes, note)
    VALUES (${targetUserId}, ${work_date}, ${start_time}, ${end_time}, ${break_minutes || 0}, ${note || null})
    ON CONFLICT (user_id, work_date) DO UPDATE SET
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      break_minutes = EXCLUDED.break_minutes,
      note = EXCLUDED.note,
      updated_at = NOW()
  `
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = parseInt(searchParams.get("id") || "0")

  // Verify ownership or manager/hr
  const rows = await sql`SELECT user_id FROM schedule_entries WHERE id = ${id}`
  if (!rows.length) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const entry = rows[0] as any
  if (entry.user_id !== session.id && session.role === "employee") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  await sql`DELETE FROM schedule_entries WHERE id = ${id}`
  return NextResponse.json({ ok: true })
}
