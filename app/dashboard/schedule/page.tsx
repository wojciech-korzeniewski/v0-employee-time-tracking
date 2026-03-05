import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { ScheduleClient } from "./schedule-client"

export default async function SchedulePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  // For managers/HR, fetch all their team members too
  let teamMembers: { id: number; full_name: string }[] = []
  if (session.role === "manager" || session.role === "hr") {
    const rows = session.role === "hr"
      ? await sql`SELECT id, full_name FROM users ORDER BY full_name`
      : await sql`SELECT id, full_name FROM users WHERE manager_id = ${session.id} OR id = ${session.id} ORDER BY full_name`
    teamMembers = rows as any
  }

  return (
    <ScheduleClient
      sessionUser={{ id: session.id, role: session.role, full_name: session.full_name }}
      teamMembers={teamMembers}
    />
  )
}
