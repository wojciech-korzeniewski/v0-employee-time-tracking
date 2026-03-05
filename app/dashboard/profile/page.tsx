import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { ProfileClient } from "./profile-client"
import { withEffectiveTotals } from "@/lib/leave-utils"

export default async function ProfilePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const users = await sql`
    SELECT u.*, m.full_name as manager_name
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.id = ${session.id}
  `
  if (!users.length) redirect("/login")

  const user = users[0]

  const contracts = await sql`
    SELECT * FROM contracts WHERE user_id = ${session.id} ORDER BY start_date DESC LIMIT 1
  `
  const year = new Date().getFullYear()
  const contractForYear = await sql`
    SELECT start_date, end_date FROM contracts
    WHERE user_id = ${session.id} AND start_date <= ${year + "-12-31"}
    AND (end_date IS NULL OR end_date >= ${year + "-01-01"})
    ORDER BY start_date DESC LIMIT 1
  `
  const rawContractForYear = contractForYear.length ? contractForYear[0] as { start_date: string | Date; end_date: string | Date | null } : null
  const contract = rawContractForYear
    ? {
        start_date: typeof rawContractForYear.start_date === "string" ? rawContractForYear.start_date : (rawContractForYear.start_date as Date).toISOString().slice(0, 10),
        end_date: rawContractForYear.end_date == null ? null : typeof rawContractForYear.end_date === "string" ? rawContractForYear.end_date : (rawContractForYear.end_date as Date).toISOString().slice(0, 10),
      }
    : null

  const allowanceRows = await sql`
    SELECT la.*, lt.name as leave_type_name, lt.is_paid, lt.accrual_type, lt.days_per_year
    FROM leave_allowances la
    JOIN leave_types lt ON lt.id = la.leave_type_id
    WHERE la.user_id = ${session.id} AND la.year = ${year}
    ORDER BY lt.name
  `
  const asOf = new Date().toISOString().split("T")[0]
  const allowances = withEffectiveTotals(allowanceRows as any[], contract, year, asOf)

  // Total hours this month
  const today = new Date()
  const monthStart = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const monthEntries = await sql`
    SELECT start_time, end_time, break_minutes
    FROM schedule_entries
    WHERE user_id = ${session.id} AND work_date >= ${monthStart}
  `
  const totalMinutes = monthEntries.reduce((sum: number, e: any) => {
    const start = e?.start_time != null ? String(e.start_time) : ""
    const end = e?.end_time != null ? String(e.end_time) : ""
    if (!start || !end) return sum
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    if (Number.isNaN(sh + sm + eh + em)) return sum
    return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (e.break_minutes || 0))
  }, 0)

  return (
    <ProfileClient
      user={user as any}
      contract={contracts[0] as any || null}
      allowances={allowances as any}
      totalHoursThisMonth={Math.round(totalMinutes / 60 * 10) / 10}
    />
  )
}
