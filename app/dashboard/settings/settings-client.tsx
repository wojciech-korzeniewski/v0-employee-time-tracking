"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Send, Slack, Trash2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

type LeaveType = {
  id: number
  name: string
  is_paid: boolean
  days_per_year: number | null
  carries_over: boolean
  max_carryover_days: number
}

type Props = {
  leaveTypes: LeaveType[]
  settings: Record<string, string>
}

export function SettingsClient({ leaveTypes, settings }: Props) {
  const router = useRouter()
  const [slackWebhook, setSlackWebhook] = useState(settings.slack_webhook_url || "")
  const [slackTime, setSlackTime] = useState(settings.slack_daily_time || "08:00")
  const [companyName, setCompanyName] = useState(settings.company_name || "")
  const [savingSettings, setSavingSettings] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)

  const [leaveDialog, setLeaveDialog] = useState(false)
  const [leaveForm, setLeaveForm] = useState({
    name: "", is_paid: true, days_per_year: "", carries_over: false, max_carryover_days: "0"
  })
  const [savingLeave, setSavingLeave] = useState(false)

  async function saveSettings() {
    setSavingSettings(true)
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slack_webhook_url: slackWebhook,
        slack_daily_time: slackTime,
        company_name: companyName,
      }),
    })
    if (res.ok) {
      toast.success("Ustawienia zapisane")
      router.refresh()
    } else {
      toast.error("Błąd zapisu")
    }
    setSavingSettings(false)
  }

  async function sendTestSlack() {
    setSendingTest(true)
    const res = await fetch("/api/slack/send", { method: "POST" })
    if (res.ok) {
      toast.success("Wiadomość testowa wysłana na Slack")
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd wysyłania")
    }
    setSendingTest(false)
  }

  async function createLeaveType(e: React.FormEvent) {
    e.preventDefault()
    setSavingLeave(true)
    const res = await fetch("/api/leave-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(leaveForm),
    })
    if (res.ok) {
      toast.success("Typ urlopu dodany")
      setLeaveDialog(false)
      setLeaveForm({ name: "", is_paid: true, days_per_year: "", carries_over: false, max_carryover_days: "0" })
      router.refresh()
    } else {
      toast.error("Błąd")
    }
    setSavingLeave(false)
  }

  async function deleteLeaveType(id: number) {
    const res = await fetch(`/api/leave-types?id=${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("Usunięto")
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd usuwania")
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Ustawienia</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Konfiguracja systemu</p>
      </div>

      <div className="flex flex-col gap-5">
        {/* Company */}
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Firma</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Nazwa firmy</Label>
              <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        {/* Slack integration */}
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Slack className="h-4 w-4" />
              Integracja Slack
            </CardTitle>
            <CardDescription>
              Codzienne powiadomienia o dostępności zespołu. Utwórz Slack App i wklej Incoming Webhook URL.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-5 pb-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Webhook URL</Label>
              <Input
                placeholder="https://hooks.slack.com/services/..."
                value={slackWebhook}
                onChange={(e) => setSlackWebhook(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Godzina wysyłki (dzienna)</Label>
              <Input
                type="time"
                value={slackTime}
                onChange={(e) => setSlackTime(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={sendTestSlack}
                disabled={sendingTest || !slackWebhook}
              >
                <Send className="h-4 w-4 mr-1.5" />
                {sendingTest ? "Wysyłanie..." : "Wyślij test"}
              </Button>
              {slackWebhook && (
                <Badge variant="secondary" className="bg-success/15 text-success border-success/30 text-xs">Webhook skonfigurowany</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Button onClick={saveSettings} disabled={savingSettings} className="w-fit">
          <Save className="h-4 w-4 mr-1.5" />
          {savingSettings ? "Zapisywanie..." : "Zapisz ustawienia"}
        </Button>

        {/* Leave types */}
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Typy urlopów</CardTitle>
              <CardDescription className="mt-0.5">Konfiguruj dostępne rodzaje urlopów</CardDescription>
            </div>
            <Button size="sm" onClick={() => setLeaveDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Dodaj
            </Button>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="flex flex-col gap-2">
              {leaveTypes.map((lt) => (
                <div key={lt.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{lt.name}</p>
                    <Badge variant={lt.is_paid ? "secondary" : "outline"} className="text-xs">
                      {lt.is_paid ? "Płatny" : "Bezpłatny"}
                    </Badge>
                    {lt.days_per_year && (
                      <Badge variant="outline" className="text-xs">{lt.days_per_year} dni/rok</Badge>
                    )}
                    {lt.carries_over && (
                      <Badge variant="outline" className="text-xs bg-primary/5 border-primary/20">Przechodzi</Badge>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => deleteLeaveType(lt.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New leave type dialog */}
      <Dialog open={leaveDialog} onOpenChange={setLeaveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nowy typ urlopu</DialogTitle></DialogHeader>
          <form onSubmit={createLeaveType} className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nazwa</Label>
              <Input value={leaveForm.name} onChange={(e) => setLeaveForm({ ...leaveForm, name: e.target.value })} required />
            </div>
            <div className="flex items-center justify-between">
              <Label>Płatny</Label>
              <Switch
                checked={leaveForm.is_paid}
                onCheckedChange={(v) => setLeaveForm({ ...leaveForm, is_paid: v })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Dni na rok (puste = nieograniczone)</Label>
              <Input
                type="number"
                min={0}
                value={leaveForm.days_per_year}
                onChange={(e) => setLeaveForm({ ...leaveForm, days_per_year: e.target.value })}
                placeholder="np. 26"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Przechodzi na następny rok</Label>
              <Switch
                checked={leaveForm.carries_over}
                onCheckedChange={(v) => setLeaveForm({ ...leaveForm, carries_over: v })}
              />
            </div>
            {leaveForm.carries_over && (
              <div className="flex flex-col gap-1.5">
                <Label>Max dni do przeniesienia</Label>
                <Input
                  type="number"
                  min={0}
                  value={leaveForm.max_carryover_days}
                  onChange={(e) => setLeaveForm({ ...leaveForm, max_carryover_days: e.target.value })}
                />
              </div>
            )}
            <Button type="submit" disabled={savingLeave}>
              {savingLeave ? "Zapisywanie..." : "Utwórz typ urlopu"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
