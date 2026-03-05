"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { ChevronLeft, ChevronRight, Save, Trash2, Plus, Users, User } from "lucide-react"
import { addWeeks, subWeeks, format, parseISO, addDays } from "date-fns"
import { pl } from "date-fns/locale"
import { getWeekDates, formatDateISO, calcWorkingMinutes, minutesToHours } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type ScheduleEntry = {
  id?: number
  work_date: string
  start_time: string
  end_time: string
  break_minutes: number
  note: string
}

type LeaveRange = { start_date: string; end_date: string }

type TeamScheduleRow = {
  user_id: number
  work_date: string
  start_time: string
  end_time: string
  break_minutes: number
}

type TeamLeaveRow = { user_id: number; start_date: string; end_date: string }

type Props = {
  sessionUser: { id: number; role: string; full_name: string }
  teamMembers: { id: number; full_name: string }[]
}

const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"]

const isManagerOrHr = (role: string) => role === "manager" || role === "hr"

export function ScheduleClient({ sessionUser, teamMembers }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<"person" | "team">("person")
  const [viewUserId, setViewUserId] = useState(sessionUser.id)
  const [entries, setEntries] = useState<Record<string, ScheduleEntry>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [leaveRanges, setLeaveRanges] = useState<LeaveRange[]>([])
  const [teamSchedule, setTeamSchedule] = useState<TeamScheduleRow[]>([])
  const [teamLeaves, setTeamLeaves] = useState<TeamLeaveRow[]>([])
  const weekDates = getWeekDates(currentDate)

  const isOwn = viewUserId === sessionUser.id
  const canEdit = isOwn || sessionUser.role === "manager" || sessionUser.role === "hr"

  const loadEntries = useCallback(async () => {
    const start = formatDateISO(weekDates[0])
    const end = formatDateISO(weekDates[6])
    const res = await fetch(`/api/schedule?userId=${viewUserId}&start=${start}&end=${end}`)
    const data = await res.json()
    const map: Record<string, ScheduleEntry> = {}
    for (const e of data) {
      const dateKey = typeof e.work_date === "string" ? e.work_date.slice(0, 10) : format(e.work_date, "yyyy-MM-dd")
      map[dateKey] = {
        id: e.id,
        work_date: dateKey,
        start_time: typeof e.start_time === "string" ? e.start_time.slice(0, 5) : String(e.start_time).slice(0, 5),
        end_time: typeof e.end_time === "string" ? e.end_time.slice(0, 5) : String(e.end_time).slice(0, 5),
        break_minutes: e.break_minutes || 0,
        note: e.note || "",
      }
    }
    setEntries(map)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUserId, currentDate])

  const loadLeaveRanges = useCallback(async () => {
    const start = formatDateISO(weekDates[0])
    const end = formatDateISO(weekDates[6])
    const res = await fetch(`/api/leave?userId=${viewUserId}&start=${start}&end=${end}`)
    if (!res.ok) {
      setLeaveRanges([])
      return
    }
    const data = await res.json()
    setLeaveRanges(data.map((r: LeaveRange) => ({ start_date: r.start_date.slice(0, 10), end_date: r.end_date.slice(0, 10) })))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewUserId, currentDate])

  const loadTeamData = useCallback(async () => {
    if (teamMembers.length === 0) return
    const start = formatDateISO(weekDates[0])
    const end = formatDateISO(weekDates[6])
    const userIds = teamMembers.map((m) => m.id).join(",")
    const [scheduleRes, leaveRes] = await Promise.all([
      fetch(`/api/schedule?userIds=${userIds}&start=${start}&end=${end}`),
      fetch(`/api/leave?start=${start}&end=${end}`),
    ])
    const scheduleData = scheduleRes.ok ? await scheduleRes.json() : []
    const leaveData = leaveRes.ok ? await leaveRes.json() : []
    setTeamSchedule(scheduleData)
    setTeamLeaves(leaveData)
  }, [teamMembers, weekDates])

  useEffect(() => { loadEntries() }, [loadEntries])
  useEffect(() => { loadLeaveRanges() }, [loadLeaveRanges])
  useEffect(() => {
    if (viewMode === "team") loadTeamData()
  }, [viewMode, loadTeamData])

  const teamCellData = useMemo(() => {
    const byUserByDate: Record<number, Record<string, { mins: number } | "leave">> = {}
    for (const m of teamMembers) {
      byUserByDate[m.id] = {}
    }
    for (const e of teamSchedule) {
      const dateKey = typeof e.work_date === "string" ? e.work_date.slice(0, 10) : format(e.work_date, "yyyy-MM-dd")
      if (!byUserByDate[e.user_id]) byUserByDate[e.user_id] = {}
      const mins = calcWorkingMinutes(
        String(e.start_time).slice(0, 5),
        String(e.end_time).slice(0, 5),
        e.break_minutes || 0
      )
      byUserByDate[e.user_id][dateKey] = { mins }
    }
    for (const l of teamLeaves) {
      const uid = l.user_id
      if (!byUserByDate[uid]) continue
      let d = parseISO(l.start_date.slice(0, 10))
      const endDate = parseISO(l.end_date.slice(0, 10))
      while (d <= endDate) {
        byUserByDate[uid][format(d, "yyyy-MM-dd")] = "leave"
        d = addDays(d, 1)
      }
    }
    return byUserByDate
  }, [teamMembers, teamSchedule, teamLeaves])

  const leaveDatesSet = useMemo(() => {
    const set = new Set<string>()
    for (const r of leaveRanges) {
      let d = parseISO(r.start_date)
      const end = parseISO(r.end_date)
      while (d <= end) {
        set.add(format(d, "yyyy-MM-dd"))
        d = addDays(d, 1)
      }
    }
    return set
  }, [leaveRanges])

  const isDateOnLeave = (date: Date) => leaveDatesSet.has(formatDateISO(date))

  const getEntry = (date: Date): ScheduleEntry => {
    const key = formatDateISO(date)
    return entries[key] || { work_date: key, start_time: "09:00", end_time: "17:00", break_minutes: 0, note: "" }
  }

  const hasEntry = (date: Date) => !!entries[formatDateISO(date)]?.start_time

  const updateEntry = (date: Date, field: keyof ScheduleEntry, value: string | number) => {
    const key = formatDateISO(date)
    setEntries((prev) => ({
      ...prev,
      [key]: { ...getEntry(date), [field]: value },
    }))
  }

  const saveEntry = async (date: Date) => {
    const key = formatDateISO(date)
    const entry = entries[key]
    if (!entry) return
    setSaving((p) => ({ ...p, [key]: true }))
    const res = await fetch("/api/schedule", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...entry, userId: viewUserId }),
    })
    if (res.ok) {
      toast.success("Zapisano")
      loadEntries()
    } else {
      toast.error("Błąd zapisu")
    }
    setSaving((p) => ({ ...p, [key]: false }))
  }

  const deleteEntry = async (date: Date) => {
    const key = formatDateISO(date)
    const entry = entries[key]
    if (!entry?.id) {
      const { [key]: _, ...rest } = entries
      setEntries(rest)
      return
    }
    const res = await fetch(`/api/schedule?id=${entry.id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Usunięto wpis")
      loadEntries()
    } else {
      toast.error("Błąd usuwania")
    }
  }

  const totalWeekMinutes = weekDates.reduce((sum, d) => {
    const e = entries[formatDateISO(d)]
    if (!e?.start_time || !e?.end_time) return sum
    return sum + calcWorkingMinutes(e.start_time, e.end_time, e.break_minutes)
  }, 0)

  const weekLabel = `${format(weekDates[0], "d MMM", { locale: pl })} – ${format(weekDates[6], "d MMM yyyy", { locale: pl })}`

  return (
    <div className="p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Harmonogram</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{weekLabel}</p>
          </div>
          {viewMode === "person" && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-sm px-3 py-1">
                Tydzień: {minutesToHours(totalWeekMinutes)}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(subWeeks(currentDate, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Ten tydzień
            </Button>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addWeeks(currentDate, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {isManagerOrHr(sessionUser.role) && teamMembers.length > 0 && (
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "person" | "team")} className="w-auto">
              <TabsList>
                <TabsTrigger value="person" className="gap-1.5">
                  <User className="h-3.5 w-3.5" />
                  Harmonogram osoby
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  Przegląd zespołu
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {viewMode === "person" && isManagerOrHr(sessionUser.role) && teamMembers.length > 0 && (
            <Select value={String(viewUserId)} onValueChange={(v) => setViewUserId(Number(v))}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.full_name}
                    {m.id === sessionUser.id ? " (ja)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {viewMode === "team" && isManagerOrHr(sessionUser.role) && teamMembers.length > 0 && (
        <div className="rounded-xl border bg-card overflow-hidden mb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold w-44">Pracownik</th>
                  {weekDates.map((date, i) => {
                    const isToday = formatDateISO(date) === formatDateISO(new Date())
                    return (
                      <th
                        key={formatDateISO(date)}
                        className={cn(
                          "p-2 text-center font-medium min-w-[4rem]",
                          i >= 5 && "text-muted-foreground",
                          isToday && "text-primary"
                        )}
                      >
                        <div>{DAY_NAMES[i]}</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          {format(date, "dd.MM", { locale: pl })}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr key={member.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      {member.full_name}
                      {member.id === sessionUser.id && (
                        <span className="text-muted-foreground text-xs ml-1">(ja)</span>
                      )}
                    </td>
                    {weekDates.map((date, i) => {
                      const key = formatDateISO(date)
                      const cell = teamCellData[member.id]?.[key]
                      const isWeekend = i >= 5
                      const isToday = key === formatDateISO(new Date())
                      return (
                        <td
                          key={key}
                          className={cn(
                            "p-2 text-center align-middle",
                            isWeekend && "bg-muted/20",
                            isToday && "bg-primary/5"
                          )}
                        >
                          {cell === "leave" ? (
                            <Badge variant="secondary" className="text-xs">Urlop</Badge>
                          ) : cell?.mins != null ? (
                            <span className="font-medium">{minutesToHours(cell.mins)}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Schedule grid (single person) */}
      {viewMode === "person" && (
      <div className="flex flex-col gap-2">
        {weekDates.map((date, i) => {
          const key = formatDateISO(date)
          const entry = getEntry(date)
          const hasE = hasEntry(date)
          const onLeave = isDateOnLeave(date)
          const canEditDay = canEdit && !onLeave
          const isWeekend = i >= 5
          const mins = hasE ? calcWorkingMinutes(entry.start_time, entry.end_time, entry.break_minutes) : 0
          const isToday = formatDateISO(date) === formatDateISO(new Date())

          return (
            <div
              key={key}
              className={cn(
                "rounded-xl border bg-card p-4",
                isWeekend && "opacity-60",
                isToday && "border-primary/40 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-4">
                {/* Day label */}
                <div className="w-20 shrink-0">
                  <p className={cn("text-sm font-semibold", isToday ? "text-primary" : "text-foreground")}>
                    {DAY_NAMES[i]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(date, "dd.MM", { locale: pl })}
                  </p>
                </div>

                {/* Entry or add button */}
                {hasE ? (
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={entry.start_time}
                        onChange={(e) => updateEntry(date, "start_time", e.target.value)}
                        disabled={!canEditDay}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        type="time"
                        value={entry.end_time}
                        onChange={(e) => updateEntry(date, "end_time", e.target.value)}
                        disabled={!canEditDay}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Przerwa:</span>
                      <Input
                        type="number"
                        value={entry.break_minutes}
                        onChange={(e) => updateEntry(date, "break_minutes", parseInt(e.target.value) || 0)}
                        disabled={!canEditDay}
                        className="w-16 h-8 text-sm"
                        min={0}
                        max={120}
                      />
                      <span className="text-xs text-muted-foreground">min</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {minutesToHours(mins)}
                    </Badge>
                    {entry.note && (
                      <span className="text-xs text-muted-foreground truncate max-w-32">{entry.note}</span>
                    )}
                    {canEditDay && (
                      <div className="flex items-center gap-1 ml-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteEntry(date)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => saveEntry(date)}
                          disabled={saving[key]}
                          className="h-8 text-xs"
                        >
                          <Save className="h-3.5 w-3.5 mr-1" />
                          Zapisz
                        </Button>
                      </div>
                    )}
                    {onLeave && (
                      <Badge variant="secondary" className="ml-auto text-xs">Urlop</Badge>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center">
                    {onLeave ? (
                      <span className="text-sm text-muted-foreground">Urlop</span>
                    ) : canEdit ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground h-8 text-sm"
                        onClick={() => {
                          setEntries((prev) => ({
                            ...prev,
                            [key]: { work_date: key, start_time: "09:00", end_time: "17:00", break_minutes: 0, note: "" },
                          }))
                        }}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Dodaj godziny
                      </Button>
                    ) : (
                      <span className="text-sm text-muted-foreground">Brak wpisów</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}
