import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { EmployeeDetailClient } from "./employee-detail-client"

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === "employee") redirect("/dashboard")

  const { id } = await params
  const userId = parseInt(id)

  const users = await sql`
    SELECT u.*, m.full_name as manager_name
    FROM users u
    LEFT JOIN users m ON m.id = u.manager_id
    WHERE u.id = ${userId}
  `
  if (!users.length) redirect("/dashboard/team")

  const user = users[0] as any

  const contracts = await sql`
    SELECT * FROM contracts WHERE user_id = ${userId} ORDER BY start_date DESC
  `

  const year = new Date().getFullYear()
  const allowances = await sql`
    SELECT la.*, lt.name as leave_type_name, lt.is_paid
    FROM leave_allowances la
    JOIN leave_types lt ON lt.id = la.leave_type_id
    WHERE la.user_id = ${userId} AND la.year = ${year}
    ORDER BY lt.name
  `

  const leaveTypes = await sql`SELECT * FROM leave_types ORDER BY name`
  const managers = await sql`SELECT id, full_name FROM users WHERE role IN ('manager','hr') ORDER BY full_name`

  return (
    <EmployeeDetailClient
      user={user}
      contracts={contracts as any}
      allowances={allowances as any}
      leaveTypes={leaveTypes as any}
      managers={managers as any}
      currentRole={session.role}
      year={year}
    />
  )
}
