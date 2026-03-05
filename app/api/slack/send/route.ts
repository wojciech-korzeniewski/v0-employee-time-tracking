import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"
import { formatDate } from "@/lib/date-utils"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const settingsRows = await sql`SELECT key, value FROM settings WHERE key IN ('slack_webhook_url', 'company_name')`
  const settings: Record<string, string> = {}
  for (const s of settingsRows) {
    settings[(s as any).key] = (s as any).value || ""
  }

  if (!settings.slack_webhook_url) {
    return NextResponse.json({ error: "Brak skonfigurowanego webhook URL" }, { status: 400 })
  }

  const today = new Date().toISOString().split("T")[0]

  // Get today's schedule
  const scheduleRows = await sql`
    SELECT u.full_name, se.start_time, se.end_time, se.break_minutes
    FROM schedule_entries se
    JOIN users u ON u.id = se.user_id
    WHERE se.work_date = ${today}
    ORDER BY se.start_time, u.full_name
  `

  // Get today's approved leaves
  const leaveRows = await sql`
    SELECT u.full_name, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN users u ON u.id = lr.user_id
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.start_date <= ${today}
      AND lr.end_date >= ${today}
      AND lr.status = 'approved'
    ORDER BY u.full_name
  `

  const dateLabel = new Date().toLocaleDateString("pl-PL", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  })

  let message = `*${settings.company_name || "WorkTime"} — Dostępność na ${dateLabel}*\n\n`

  if (scheduleRows.length > 0) {
    message += `*Pracują dzisiaj (${scheduleRows.length}):*\n`
    for (const r of scheduleRows) {
      const start = (r as any).start_time.slice(0, 5)
      const end = (r as any).end_time.slice(0, 5)
      message += `• ${(r as any).full_name} — ${start}–${end}\n`
    }
  } else {
    message += `Brak wpisów w harmonogramie na dziś.\n`
  }

  if (leaveRows.length > 0) {
    message += `\n*Na urlopie (${leaveRows.length}):*\n`
    for (const r of leaveRows) {
      message += `• ${(r as any).full_name} — ${(r as any).leave_type_name}\n`
    }
  }

  const response = await fetch(settings.slack_webhook_url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  })

  if (!response.ok) {
    return NextResponse.json({ error: "Slack API error" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
