import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { LeaveClient } from "./leave-client"
import { withEffectiveTotals } from "@/lib/leave-utils"

export default async function LeavePage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const year = new Date().getFullYear()

  const allowanceRows = await sql`
    SELECT la.*, lt.name as leave_type_name, lt.is_paid, lt.carries_over, lt.accrual_type, lt.days_per_year
    FROM leave_allowances la
    JOIN leave_types lt ON lt.id = la.leave_type_id
    WHERE la.user_id = ${session.id} AND la.year = ${year}
    ORDER BY lt.name
  `
  const contractRows = await sql`
    SELECT start_date, end_date FROM contracts
    WHERE user_id = ${session.id} AND start_date <= ${year + "-12-31"}
    AND (end_date IS NULL OR end_date >= ${year + "-01-01"})
    ORDER BY start_date DESC LIMIT 1
  `
  const contract = contractRows.length ? (contractRows[0] as { start_date: string; end_date: string | null }) : null
  const asOf = new Date().toISOString().split("T")[0]
  const allowances = withEffectiveTotals(allowanceRows as any[], contract, year, asOf)

  const requests = await sql`
    SELECT lr.*, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.user_id = ${session.id}
    ORDER BY lr.created_at DESC
    LIMIT 50
  `

  const leaveTypes = await sql`SELECT * FROM leave_types ORDER BY name`

  return (
    <LeaveClient
      userId={session.id}
      allowances={allowances as any}
      requests={requests as any}
      leaveTypes={leaveTypes as any}
    />
  )
}
