"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, XCircle, Clock, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-utils"
import { cn } from "@/lib/utils"

type LeaveRequest = {
  id: number
  user_name: string
  user_email: string
  leave_type_name: string
  start_date: string
  end_date: string
  days_count: number
  status: "pending" | "approved" | "rejected"
  note: string | null
  manager_note: string | null
  created_at: string
}

const statusConfig = {
  pending: { label: "Oczekuje", className: "bg-warning/15 text-warning border-warning/30" },
  approved: { label: "Zatwierdzony", className: "bg-success/15 text-success border-success/30" },
  rejected: { label: "Odrzucony", className: "bg-destructive/15 text-destructive border-destructive/30" },
}

export function ApprovalsClient({ requests }: { requests: LeaveRequest[] }) {
  const router = useRouter()
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [noteDialog, setNoteDialog] = useState<{ id: number; action: "approved" | "rejected" } | null>(null)
  const [managerNote, setManagerNote] = useState("")

  const pending = requests.filter((r) => r.status === "pending")
  const processed = requests.filter((r) => r.status !== "pending")

  async function processRequest(id: number, status: "approved" | "rejected", note?: string) {
    setProcessingId(id)
    const res = await fetch("/api/leave", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, manager_note: note }),
    })
    if (res.ok) {
      toast.success(status === "approved" ? "Wniosek zatwierdzony" : "Wniosek odrzucony")
      router.refresh()
    } else {
      toast.error("Błąd przetwarzania wniosku")
    }
    setProcessingId(null)
    setNoteDialog(null)
    setManagerNote("")
  }

  function RequestCard({ r }: { r: LeaveRequest }) {
    const initials = r.user_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    const sc = statusConfig[r.status]

    return (
      <Card className="border">
        <CardContent className="p-4">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold">{r.user_name}</p>
                <Badge variant="outline" className={cn("text-xs", sc.className)}>{sc.label}</Badge>
              </div>
              <p className="text-sm text-foreground mt-0.5">{r.leave_type_name}</p>
              <p className="text-xs text-muted-foreground">
                {formatDate(r.start_date)} – {formatDate(r.end_date)} · {r.days_count} dni
              </p>
              {r.note && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {r.note}
                </p>
              )}
              {r.manager_note && (
                <p className="text-xs text-muted-foreground mt-0.5">Uwaga: "{r.manager_note}"</p>
              )}
            </div>
            {r.status === "pending" && (
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNoteDialog({ id: r.id, action: "rejected" })}
                  disabled={processingId === r.id}
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Odrzuć
                </Button>
                <Button
                  size="sm"
                  onClick={() => processRequest(r.id, "approved")}
                  disabled={processingId === r.id}
                  className="h-8 bg-success hover:bg-success/90 text-success-foreground"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Zatwierdź
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Akceptacje urlopów</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {pending.length > 0 ? `${pending.length} wniosków oczekuje na decyzję` : "Brak oczekujących wniosków"}
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="relative">
            Oczekujące
            {pending.length > 0 && (
              <span className="ml-2 h-5 w-5 rounded-full bg-warning text-warning-foreground text-xs flex items-center justify-center font-medium">
                {pending.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="processed">Historia</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card className="border">
              <CardContent className="p-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Wszystkie wnioski zostały rozpatrzone</p>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {pending.map((r) => <RequestCard key={r.id} r={r} />)}
            </div>
          )}
        </TabsContent>

        <TabsContent value="processed">
          {processed.length === 0 ? (
            <Card className="border">
              <CardContent className="p-6 text-center text-sm text-muted-foreground">Brak historii</CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-2">
              {processed.map((r) => <RequestCard key={r.id} r={r} />)}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Reject dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => { setNoteDialog(null); setManagerNote("") }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Odrzuć wniosek</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Powód odrzucenia (opcjonalnie)</Label>
              <Textarea
                value={managerNote}
                onChange={(e) => setManagerNote(e.target.value)}
                placeholder="Podaj powód..."
                rows={3}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setNoteDialog(null); setManagerNote("") }}>
                Anuluj
              </Button>
              <Button
                variant="destructive"
                onClick={() => noteDialog && processRequest(noteDialog.id, "rejected", managerNote)}
              >
                Odrzuć wniosek
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
