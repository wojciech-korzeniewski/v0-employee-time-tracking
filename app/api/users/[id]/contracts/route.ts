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
  const { contract_type, salary_type, salary_amount, start_date, end_date } = await req.json()

  // Deactivate old contracts
  await sql`UPDATE contracts SET is_active = false WHERE user_id = ${userId}`

  await sql`
    INSERT INTO contracts (user_id, contract_type, salary_type, salary_amount, start_date, end_date, is_active)
    VALUES (${userId}, ${contract_type}, ${salary_type}, ${parseFloat(salary_amount)}, ${start_date}, ${end_date || null}, true)
  `

  return NextResponse.json({ ok: true })
}
