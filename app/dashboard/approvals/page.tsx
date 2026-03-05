import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { ApprovalsClient } from "./approvals-client"

export default async function ApprovalsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role === "employee") redirect("/dashboard")

  const requests = session.role === "hr"
    ? await sql`
        SELECT lr.*, lt.name as leave_type_name, u.full_name as user_name, u.email as user_email
        FROM leave_requests lr
        JOIN leave_types lt ON lt.id = lr.leave_type_id
        JOIN users u ON u.id = lr.user_id
        ORDER BY lr.status = 'pending' DESC, lr.created_at DESC
        LIMIT 100
      `
    : await sql`
        SELECT lr.*, lt.name as leave_type_name, u.full_name as user_name, u.email as user_email
        FROM leave_requests lr
        JOIN leave_types lt ON lt.id = lr.leave_type_id
        JOIN users u ON u.id = lr.user_id
        WHERE u.manager_id = ${session.id}
        ORDER BY lr.status = 'pending' DESC, lr.created_at DESC
        LIMIT 100
      `

  return <ApprovalsClient requests={requests as any} />
}
