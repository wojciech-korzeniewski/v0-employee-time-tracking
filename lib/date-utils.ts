import { format, startOfWeek, addDays, parseISO } from "date-fns"
import { pl } from "date-fns/locale"

export function getWeekDates(date: Date): Date[] {
  const start = startOfWeek(date, { weekStartsOn: 1 })
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date
  return format(d, "dd.MM.yyyy", { locale: pl })
}

export function formatDateISO(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

export function formatDayName(date: Date): string {
  return format(date, "EEEE", { locale: pl })
}

export function formatShortDayName(date: Date): string {
  return format(date, "EEE", { locale: pl })
}

export function calcWorkingMinutes(start: string, end: string, breakMin: number): number {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const totalMin = (eh * 60 + em) - (sh * 60 + sm)
  return Math.max(0, totalMin - breakMin)
}

export function minutesToHours(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

export function countWorkingDays(start: Date, end: Date): number {
  let count = 0
  const cur = new Date(start)
  while (cur <= end) {
    const day = cur.getDay()
    if (day !== 0 && day !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}
