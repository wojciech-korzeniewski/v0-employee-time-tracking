"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, CalendarRange, CheckCircle2, XCircle, Clock, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { formatDate, countWorkingDays } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

type LeaveAllowance = {
  id: number
  leave_type_id: number
  leave_type_name: string
  is_paid: boolean
  total_days: number
  used_days: number
  carried_over_days: number
  carries_over: boolean
}

type LeaveRequest = {
  id: number
  leave_type_name: string
  start_date: string
  end_date: string
  days_count: number
  status: "pending" | "approved" | "rejected"
  note: string | null
  manager_note: string | null
  created_at: string
}

type LeaveType = {
  id: number
  name: string
  is_paid: boolean
  days_per_year: number | null
}

type Props = {
  userId: number
  allowances: LeaveAllowance[]
  requests: LeaveRequest[]
  leaveTypes: LeaveType[]
}

const statusConfig = {
  pending: { label: "Oczekuje", icon: Clock, className: "bg-warning/15 text-warning-foreground border-warning/30" },
  approved: { label: "Zatwierdzony", icon: CheckCircle2, className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Odrzucony", icon: XCircle, className: "bg-destructive/15 text-destructive border-destructive/30" },
}

export function LeaveClient({ userId, allowances, requests, leaveTypes }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [leaveTypeId, setLeaveTypeId] = useState("")
  const [note, setNote] = useState("")
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const dayCount = startDate && endDate
    ? countWorkingDays(new Date(startDate), new Date(endDate))
    : 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!leaveTypeId || !startDate || !endDate) return
    setSubmitting(true)
    const res = await fetch("/api/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leave_type_id: parseInt(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        days_count: dayCount,
        note,
      }),
    })
    if (res.ok) {
      toast.success("Wniosek urlopowy złożony")
      setOpen(false)
      setStartDate("")
      setEndDate("")
      setLeaveTypeId("")
      setNote("")
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd składania wniosku")
    }
    setSubmitting(false)
  }

  async function handleDelete(requestId: number) {
    setDeletingId(requestId)
    const res = await fetch(`/api/leave?id=${requestId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Wniosek usunięty")
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Nie udało się usunąć wniosku")
    }
    setDeletingId(null)
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Urlopy</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Twoje wnioski urlopowe i saldo</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Nowy wniosek
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Wniosek urlopowy</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-2">
              <div className="flex flex-col gap-1.5">
                <Label>Rodzaj urlopu</Label>
                <Select value={leaveTypeId} onValueChange={setLeaveTypeId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Wybierz rodzaj" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Od</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Do</Label>
                  <Input type="date" value={endDate} min={startDate} onChange={(e) => setEndDate(e.target.value)} required />
                </div>
              </div>
              {dayCount > 0 && (
                <p className="text-sm text-muted-foreground">
                  Liczba dni roboczych: <strong className="text-foreground">{dayCount}</strong>
                </p>
              )}
              <div className="flex flex-col gap-1.5">
                <Label>Notatka (opcjonalnie)</Label>
                <Textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Dodatkowe informacje..."
                  rows={2}
                />
              </div>
              <Button type="submit" disabled={submitting || dayCount === 0}>
                {submitting ? "Wysyłanie..." : "Złóż wniosek"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Allowances */}
      {allowances.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Saldo urlopów {new Date().getFullYear()}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {allowances.map((a) => {
              const total = Number((a as any).effective_total_days ?? a.total_days) + Number(a.carried_over_days)
              const used = Number(a.used_days)
              const remaining = total - used
              const pct = total > 0 ? Math.round((used / total) * 100) : 0
              return (
                <Card key={a.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium">{a.leave_type_name}</p>
                        <p className="text-xs text-muted-foreground">{a.is_paid ? "Płatny" : "Bezpłatny"}</p>
                      </div>
                      <CalendarRange className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="text-2xl font-bold mb-1">{remaining}</p>
                    <p className="text-xs text-muted-foreground mb-2">
                      z {total} dni
                      {Number(a.carried_over_days) > 0 && ` (+${Number(a.carried_over_days)} przeniesione)`}
                    </p>
                    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Requests */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Historia wniosków</h2>
        {requests.length === 0 ? (
          <Card className="border">
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              Brak wniosków urlopowych
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {requests.map((r) => {
              const sc = statusConfig[r.status]
              const Icon = sc.icon
              return (
                <Card key={r.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="text-sm font-medium">{r.leave_type_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(r.start_date)} – {formatDate(r.end_date)} · {r.days_count} dni
                          </p>
                          {r.note && <p className="text-xs text-muted-foreground mt-0.5">"{r.note}"</p>}
                          {r.manager_note && (
                            <p className="text-xs text-muted-foreground mt-0.5">Uwaga przełożonego: "{r.manager_note}"</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={cn("flex items-center gap-1.5 text-xs", sc.className)}
                        >
                          <Icon className="h-3 w-3" />
                          {sc.label}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              disabled={deletingId === r.id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Usunąć wniosek?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {r.status === "approved"
                                  ? "Wniosek jest zatwierdzony – po usunięciu dni zostaną przywrócone do salda. Czy na pewno chcesz usunąć ten wniosek?"
                                  : "Ta operacja jest nieodwracalna. Czy na pewno chcesz usunąć ten wniosek?"}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Anuluj</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(r.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Usuń
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
