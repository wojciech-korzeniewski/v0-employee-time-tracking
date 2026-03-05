import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { ReportsClient } from "./reports-client"
import { getMonthsWorkedInYear, getEffectiveTotalDays } from "@/lib/leave-utils"

export default async function ReportsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "hr") redirect("/dashboard")

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${new Date(year, month, 0).getDate()}`

  const users = await sql`SELECT id, full_name FROM users ORDER BY full_name`

  // Monthly hours per user
  const scheduleData = await sql`
    SELECT
      u.id,
      u.full_name,
      COALESCE(SUM(
        EXTRACT(EPOCH FROM (se.end_time::time - se.start_time::time)) / 60
        - COALESCE(se.break_minutes, 0)
      ), 0) as total_minutes
    FROM users u
    LEFT JOIN schedule_entries se ON se.user_id = u.id
      AND se.work_date >= ${monthStart}
      AND se.work_date <= ${monthEnd}
    GROUP BY u.id, u.full_name
    ORDER BY u.full_name
  `

  // Leave summary per user (with accrual info)
  const leaveSummaryRows = await sql`
    SELECT
      u.id,
      u.full_name,
      lt.name as leave_type_name,
      la.total_days,
      la.used_days,
      la.carried_over_days,
      lt.accrual_type,
      lt.days_per_year,
      la.annual_days
    FROM users u
    JOIN leave_allowances la ON la.user_id = u.id AND la.year = ${year}
    JOIN leave_types lt ON lt.id = la.leave_type_id
    ORDER BY u.full_name, lt.name
  `

  const contractRows = await sql`
    SELECT user_id, start_date, end_date FROM contracts
    WHERE start_date <= ${year + "-12-31"} AND (end_date IS NULL OR end_date >= ${year + "-01-01"})
  `
  const contractsByUser: Record<number, { start_date: string; end_date: string | null }> = {}
  for (const r of contractRows as any[]) {
    if (!contractsByUser[r.user_id]) contractsByUser[r.user_id] = { start_date: r.start_date, end_date: r.end_date }
  }

  const asOf = new Date().toISOString().split("T")[0]
  const leaveSummary = (leaveSummaryRows as any[]).map((row) => {
    const contract = contractsByUser[row.id] ?? null
    const monthsWorked = getMonthsWorkedInYear(contract, year, asOf)
    const effective_total_days = getEffectiveTotalDays(
      Number(row.total_days),
      row.accrual_type ?? "upfront",
      row.annual_days != null ? Number(row.annual_days) : null,
      row.days_per_year != null ? Number(row.days_per_year) : null,
      monthsWorked
    )
    return { ...row, effective_total_days }
  })

  return (
    <ReportsClient
      scheduleData={scheduleData as any}
      leaveSummary={leaveSummary as any}
      month={month}
      year={year}
      users={users as any}
    />
  )
}
