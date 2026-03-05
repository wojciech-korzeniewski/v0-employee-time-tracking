import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { TeamClient } from "./team-client"

export default async function TeamPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === "employee") redirect("/dashboard")

  const users = session.role === "hr"
    ? await sql`
        SELECT u.*, m.full_name as manager_name
        FROM users u
        LEFT JOIN users m ON m.id = u.manager_id
        ORDER BY u.full_name
      `
    : await sql`
        SELECT u.*, m.full_name as manager_name
        FROM users u
        LEFT JOIN users m ON m.id = u.manager_id
        WHERE u.manager_id = ${session.id}
        ORDER BY u.full_name
      `

  const managers = await sql`
    SELECT id, full_name FROM users WHERE role IN ('manager', 'hr') ORDER BY full_name
  `

  return <TeamClient users={users as any} managers={managers as any} currentRole={session.role} />
}
