import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { ProfileClient } from "./profile-client"

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
  const allowances = await sql`
    SELECT la.*, lt.name as leave_type_name, lt.is_paid
    FROM leave_allowances la
    JOIN leave_types lt ON lt.id = la.leave_type_id
    WHERE la.user_id = ${session.id} AND la.year = ${year}
    ORDER BY lt.name
  `

  // Total hours this month
  const today = new Date()
  const monthStart = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const monthEntries = await sql`
    SELECT start_time, end_time, break_minutes
    FROM schedule_entries
    WHERE user_id = ${session.id} AND work_date >= ${monthStart}
  `
  const totalMinutes = monthEntries.reduce((sum: number, e: any) => {
    const [sh, sm] = e.start_time.split(":").map(Number)
    const [eh, em] = e.end_time.split(":").map(Number)
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
