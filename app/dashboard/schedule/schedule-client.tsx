"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, Save, Trash2, Plus } from "lucide-react"
import { addWeeks, subWeeks, format } from "date-fns"
import { pl } from "date-fns/locale"
import { getWeekDates, formatDateISO, calcWorkingMinutes, minutesToHours } from "@/lib/date-utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

type Props = {
  sessionUser: { id: number; role: string; full_name: string }
  teamMembers: { id: number; full_name: string }[]
}

const DAY_NAMES = ["Pon", "Wt", "Śr", "Czw", "Pt", "Sob", "Nd"]

export function ScheduleClient({ sessionUser, teamMembers }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewUserId, setViewUserId] = useState(sessionUser.id)
  const [entries, setEntries] = useState<Record<string, ScheduleEntry>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
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

  useEffect(() => { loadEntries() }, [loadEntries])

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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm px-3 py-1">
              Tydzień: {minutesToHours(totalWeekMinutes)}
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

          {(sessionUser.role === "manager" || sessionUser.role === "hr") && teamMembers.length > 0 && (
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

      {/* Schedule grid */}
      <div className="flex flex-col gap-2">
        {weekDates.map((date, i) => {
          const key = formatDateISO(date)
          const entry = getEntry(date)
          const hasE = hasEntry(date)
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
                        disabled={!canEdit}
                        className="w-28 h-8 text-sm"
                      />
                      <span className="text-muted-foreground text-sm">–</span>
                      <Input
                        type="time"
                        value={entry.end_time}
                        onChange={(e) => updateEntry(date, "end_time", e.target.value)}
                        disabled={!canEdit}
                        className="w-28 h-8 text-sm"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">Przerwa:</span>
                      <Input
                        type="number"
                        value={entry.break_minutes}
                        onChange={(e) => updateEntry(date, "break_minutes", parseInt(e.target.value) || 0)}
                        disabled={!canEdit}
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
                    {canEdit && (
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
                  </div>
                ) : (
                  <div className="flex-1 flex items-center">
                    {canEdit ? (
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
    </div>
  )
}
