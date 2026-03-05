"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Edit2, X, Clock, CalendarDays, Building2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-utils"

type Props = {
  user: any
  contract: any | null
  allowances: any[]
  totalHoursThisMonth: number
}

const roleLabels: Record<string, string> = {
  employee: "Pracownik",
  manager: "Manager",
  hr: "HR",
}

const contractTypeLabels: Record<string, string> = {
  UoP: "Umowa o pracę",
  B2B: "Kontrakt B2B",
  UoZ: "Umowa o dzieło",
  Zlecenie: "Umowa zlecenie",
}

export function ProfileClient({ user, contract, allowances, totalHoursThisMonth }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
  })
  const [passwordForm, setPasswordForm] = useState({ current: "", next: "", confirm: "" })
  const [savingPassword, setSavingPassword] = useState(false)

  const initials = user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  async function saveProfile() {
    setSaving(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, birth_date: user.birth_date, pesel: user.pesel, nip: user.nip, bank_account: user.bank_account }),
    })
    if (res.ok) {
      toast.success("Profil zaktualizowany")
      setEditing(false)
      router.refresh()
    } else {
      toast.error("Błąd zapisu")
    }
    setSaving(false)
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (passwordForm.next !== passwordForm.confirm) {
      toast.error("Hasła nie są takie same")
      return
    }
    setSavingPassword(true)
    const res = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current: passwordForm.current, next: passwordForm.next }),
    })
    if (res.ok) {
      toast.success("Hasło zmienione")
      setPasswordForm({ current: "", next: "", confirm: "" })
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd zmiany hasła")
    }
    setSavingPassword(false)
  }

  const year = new Date().getFullYear()

  return (
    <div className="p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Avatar className="h-14 w-14">
          <AvatarFallback className="bg-primary/10 text-primary font-bold text-xl">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{user.full_name}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary">{roleLabels[user.role]}</Badge>
            {user.manager_name && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3" />
                Przełożony: {user.manager_name}
              </span>
            )}
          </div>
        </div>
        {editing ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditing(false)}>
              <X className="h-4 w-4 mr-1" /> Anuluj
            </Button>
            <Button size="sm" onClick={saveProfile} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> Zapisz
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            <Edit2 className="h-4 w-4 mr-1" /> Edytuj
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="border">
          <CardContent className="p-3">
            <Clock className="h-4 w-4 text-primary mb-1" />
            <p className="text-xl font-bold">{totalHoursThisMonth}h</p>
            <p className="text-xs text-muted-foreground">Ten miesiąc</p>
          </CardContent>
        </Card>
        {allowances.slice(0, 3).map((a: any) => {
          const remaining = a.total_days + a.carried_over_days - a.used_days
          return (
            <Card key={a.id} className="border">
              <CardContent className="p-3">
                <CalendarDays className="h-4 w-4 text-success mb-1" />
                <p className="text-xl font-bold">{remaining}</p>
                <p className="text-xs text-muted-foreground truncate">{a.leave_type_name}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Personal data */}
        <Card className="border">
          <CardHeader className="pb-2 pt-4 px-5">
            <CardTitle className="text-sm font-semibold">Dane osobowe</CardTitle>
          </CardHeader>
          <CardContent className="px-5 pb-4 flex flex-col gap-3">
            {[
              { label: "Imię i nazwisko", key: "full_name" },
              { label: "Email", key: "email", type: "email" },
              { label: "Telefon", key: "phone", type: "tel" },
              { label: "Adres", key: "address" },
            ].map(({ label, key, type = "text" }) => (
              <div key={key} className="flex flex-col gap-1">
                <Label className="text-xs text-muted-foreground">{label}</Label>
                {editing ? (
                  <Input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="h-8 text-sm"
                  />
                ) : (
                  <p className="text-sm">{(user as any)[key] || <span className="text-muted-foreground">—</span>}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          {/* Contract */}
          {contract && (
            <Card className="border">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4" /> Umowa
                </CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Typ</Label>
                  <p className="text-sm">{contractTypeLabels[contract.contract_type] || contract.contract_type}</p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Wynagrodzenie</Label>
                  <p className="text-sm">
                    {contract.salary_amount} PLN / {contract.salary_type === "monthly" ? "miesiąc" : "godzinę"}
                  </p>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Okres</Label>
                  <p className="text-sm">
                    {formatDate(contract.start_date)}{contract.end_date ? ` – ${formatDate(contract.end_date)}` : " – czas nieokreślony"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Change password */}
          <Card className="border">
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className="text-sm font-semibold">Zmiana hasła</CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <form onSubmit={changePassword} className="flex flex-col gap-2.5">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Obecne hasło</Label>
                  <Input type="password" value={passwordForm.current} onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })} className="h-8" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Nowe hasło</Label>
                  <Input type="password" value={passwordForm.next} onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })} className="h-8" required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs">Powtórz hasło</Label>
                  <Input type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })} className="h-8" required />
                </div>
                <Button type="submit" size="sm" disabled={savingPassword} className="mt-1">
                  {savingPassword ? "Zmienianie..." : "Zmień hasło"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
