import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { Clock, CalendarDays, CheckCircle2, TrendingUp, Users, AlertCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/date-utils"
import { withEffectiveTotals } from "@/lib/leave-utils"

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const today = new Date()
  const todayStr = today.toISOString().split("T")[0]
  const year = today.getFullYear()

  // Get leave allowances with accrual info
  const allowanceRows = await sql`
    SELECT la.*, lt.name as leave_type_name, lt.accrual_type, lt.days_per_year
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
  const rawContract = contractRows.length ? contractRows[0] as { start_date: string | Date; end_date: string | Date | null } : null
  const contract = rawContract
    ? {
        start_date: typeof rawContract.start_date === "string" ? rawContract.start_date : (rawContract.start_date as Date).toISOString().slice(0, 10),
        end_date: rawContract.end_date == null ? null : typeof rawContract.end_date === "string" ? rawContract.end_date : (rawContract.end_date as Date).toISOString().slice(0, 10),
      }
    : null
  const allowances = withEffectiveTotals(allowanceRows as any[], contract, year, todayStr)

  // Get upcoming leaves for current user
  const upcomingLeaves = await sql`
    SELECT lr.*, lt.name as leave_type_name
    FROM leave_requests lr
    JOIN leave_types lt ON lt.id = lr.leave_type_id
    WHERE lr.user_id = ${session.id}
      AND lr.start_date >= ${todayStr}
      AND lr.status = 'approved'
    ORDER BY lr.start_date
    LIMIT 3
  `

  // Get pending leaves for current user
  const pendingLeavesRows = await sql`
    SELECT COUNT(*) as count
    FROM leave_requests
    WHERE user_id = ${session.id} AND status = 'pending'
  `
  const pendingLeavesCount = (pendingLeavesRows?.[0] as { count: string | number } | undefined)?.count
  const pendingLeavesCountNum = pendingLeavesCount != null ? parseInt(String(pendingLeavesCount), 10) || 0 : 0

  // Today's schedule
  const todaySchedule = await sql`
    SELECT * FROM schedule_entries WHERE user_id = ${session.id} AND work_date = ${todayStr}
  `

  // Total hours this month
  const monthStart = `${year}-${String(today.getMonth() + 1).padStart(2, "0")}-01`
  const monthSchedule = await sql`
    SELECT start_time, end_time, break_minutes
    FROM schedule_entries
    WHERE user_id = ${session.id}
      AND work_date >= ${monthStart}
      AND work_date <= ${todayStr}
  `
  const totalMinutes = monthSchedule.reduce((sum: number, e: any) => {
    const start = e?.start_time != null ? String(e.start_time) : ""
    const end = e?.end_time != null ? String(e.end_time) : ""
    if (!start || !end) return sum
    const [sh, sm] = start.split(":").map(Number)
    const [eh, em] = end.split(":").map(Number)
    if (Number.isNaN(sh + sm + eh + em)) return sum
    return sum + Math.max(0, (eh * 60 + em) - (sh * 60 + sm) - (e.break_minutes || 0))
  }, 0)
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10

  // Manager/HR: pending approvals count
  let pendingApprovals = 0
  if (session.role === "manager" || session.role === "hr") {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM leave_requests lr
      JOIN users u ON u.id = lr.user_id
      WHERE lr.status = 'pending'
        AND (${session.role} = 'hr' OR u.manager_id = ${session.id})
    `
    const row = result?.[0] as { count: string | number } | undefined
    pendingApprovals = row ? parseInt(String(row.count), 10) || 0 : 0
  }

  // HR: total employees
  let totalEmployees = 0
  if (session.role === "hr") {
    const result = await sql`SELECT COUNT(*) as count FROM users WHERE role != 'hr'`
    const row = result?.[0] as { count: string | number } | undefined
    totalEmployees = row ? parseInt(String(row.count), 10) || 0 : 0
  }

  const mainLeave = allowances.find((a: any) => a.leave_type_name === "Urlop wypoczynkowy")

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Dzień dobry, {(session.full_name || "").trim().split(/\s+/)[0] || "użytkowniku"}
        </h1>
        <p className="text-muted-foreground text-sm mt-0.5">
          {today.toLocaleDateString("pl-PL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Today */}
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {todaySchedule.length > 0 && todaySchedule[0]
                ? `${String((todaySchedule[0] as any).start_time ?? "").slice(0, 5)}–${String((todaySchedule[0] as any).end_time ?? "").slice(0, 5)}`
                : "–"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Dzisiaj</p>
          </CardContent>
        </Card>

        {/* Hours this month */}
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">{totalHours}h</p>
            <p className="text-xs text-muted-foreground mt-0.5">Godziny w tym miesiącu</p>
          </CardContent>
        </Card>

        {/* Leave days remaining */}
        <Card className="border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CalendarDays className="h-4 w-4 text-success" />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {mainLeave
                ? Number(mainLeave.effective_total_days) + Number(mainLeave.carried_over_days) - Number(mainLeave.used_days)
                : "–"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Dni urlopu pozostało</p>
          </CardContent>
        </Card>

        {/* Manager/HR: pending approvals | Employee: pending requests */}
        {session.role !== "employee" ? (
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${pendingApprovals > 0 ? "bg-warning/10" : "bg-muted"}`}>
                  <CheckCircle2 className={`h-4 w-4 ${pendingApprovals > 0 ? "text-warning" : "text-muted-foreground"}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{pendingApprovals}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Oczekuje na akceptację</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${pendingLeavesCountNum > 0 ? "bg-warning/10" : "bg-muted"}`}>
                  <AlertCircle className={`h-4 w-4 ${pendingLeavesCountNum > 0 ? "text-warning" : "text-muted-foreground"}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-foreground">{pendingLeavesCountNum}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Wnioski oczekujące</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* HR extra stat */}
      {session.role === "hr" && (
        <Card className="border mb-6">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold">{totalEmployees}</p>
              <p className="text-sm text-muted-foreground">Pracownicy w firmie</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Leave allowances */}
        {allowances.length > 0 && (
          <Card className="border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-foreground">Saldo urlopów {year}</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <div className="flex flex-col gap-3">
                {allowances.map((a: any) => {
                  const total = Number(a.effective_total_days) + Number(a.carried_over_days)
                  const used = Number(a.used_days)
                  const remaining = total - used
                  const pct = total > 0 ? Math.round((used / total) * 100) : 0
                  return (
                    <div key={a.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-foreground">{a.leave_type_name}</span>
                        <span className="text-sm font-medium">
                          {remaining} / {total} dni
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming leaves */}
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-foreground">Nadchodzące urlopy</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            {upcomingLeaves.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zaplanowanych urlopów</p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcomingLeaves.map((l: any) => (
                  <div key={l.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{l.leave_type_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(l.start_date)} – {formatDate(l.end_date)}
                      </p>
                    </div>
                    <Badge variant="secondary">{l.days_count} dni</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
