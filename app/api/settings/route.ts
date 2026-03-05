import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import sql from "@/lib/db"

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== "hr") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { slack_webhook_url, slack_daily_time, company_name } = await req.json()

  await sql`
    INSERT INTO settings (key, value) VALUES ('slack_webhook_url', ${slack_webhook_url || null})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `
  await sql`
    INSERT INTO settings (key, value) VALUES ('slack_daily_time', ${slack_daily_time || "08:00"})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `
  await sql`
    INSERT INTO settings (key, value) VALUES ('company_name', ${company_name || ""})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
  `

  return NextResponse.json({ ok: true })
}
