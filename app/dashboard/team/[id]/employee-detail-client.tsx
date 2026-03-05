"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Edit2, Save, X } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDate } from "@/lib/date-utils"

type Props = {
  user: any
  contracts: any[]
  allowances: any[]
  leaveTypes: any[]
  managers: { id: number; full_name: string }[]
  currentRole: string
  year: number
}

const contractLabels: Record<string, string> = {
  hourly: "Stawka godzinowa",
  monthly: "Stawka miesięczna",
}

export function EmployeeDetailClient({ user, contracts, allowances, leaveTypes, managers, currentRole, year }: Props) {
  const router = useRouter()
  const [editingProfile, setEditingProfile] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [profileForm, setProfileForm] = useState({
    full_name: user.full_name || "",
    email: user.email || "",
    phone: user.phone || "",
    address: user.address || "",
    birth_date: user.birth_date?.split("T")[0] || "",
    pesel: user.pesel || "",
    nip: user.nip || "",
    bank_account: user.bank_account || "",
    role: user.role || "employee",
    manager_id: user.manager_id ? String(user.manager_id) : "",
  })

  const [allowanceDialog, setAllowanceDialog] = useState(false)
  const [allowanceForm, setAllowanceForm] = useState({ leave_type_id: "", total_days: "", year: String(year) })
  const [contractDialog, setContractDialog] = useState(false)
  const [contractForm, setContractForm] = useState({
    contract_type: "UoP", salary_type: "monthly", salary_amount: "",
    start_date: "", end_date: "",
  })

  const initials = user.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)

  async function saveProfile() {
    setSavingProfile(true)
    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileForm),
    })
    if (res.ok) {
      toast.success("Profil zaktualizowany")
      setEditingProfile(false)
      router.refresh()
    } else {
      toast.error("Błąd zapisu")
    }
    setSavingProfile(false)
  }

  async function saveAllowance(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/users/${user.id}/allowances`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(allowanceForm),
    })
    if (res.ok) {
      toast.success("Saldo urlopowe zaktualizowane")
      setAllowanceDialog(false)
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd")
    }
  }

  async function saveContract(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch(`/api/users/${user.id}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contractForm),
    })
    if (res.ok) {
      toast.success("Umowa dodana")
      setContractDialog(false)
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd")
    }
  }

  const isEditable = currentRole === "hr"

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/team">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3 flex-1">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{user.full_name}</h1>
            <p className="text-sm text-muted-foreground">@{user.login}</p>
          </div>
        </div>
        {isEditable && (
          editingProfile ? (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingProfile(false)}>
                <X className="h-4 w-4 mr-1" /> Anuluj
              </Button>
              <Button size="sm" onClick={saveProfile} disabled={savingProfile}>
                <Save className="h-4 w-4 mr-1" /> Zapisz
              </Button>
            </div>
          ) : (
            <Button variant="outline" size="sm" onClick={() => setEditingProfile(true)}>
              <Edit2 className="h-4 w-4 mr-1" /> Edytuj
            </Button>
          )
        )}
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-5">
          <TabsTrigger value="profile">Profil</TabsTrigger>
          <TabsTrigger value="contracts">Umowy</TabsTrigger>
          <TabsTrigger value="leave">Urlopy</TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Dane podstawowe</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 flex flex-col gap-3">
                {[
                  { label: "Imię i nazwisko", key: "full_name", type: "text" },
                  { label: "Email", key: "email", type: "email" },
                  { label: "Telefon", key: "phone", type: "tel" },
                  { label: "Adres", key: "address", type: "text" },
                  { label: "Data urodzenia", key: "birth_date", type: "date" },
                ].map(({ label, key, type }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    {editingProfile ? (
                      <Input
                        type={type}
                        value={(profileForm as any)[key]}
                        onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm">{(user as any)[key] ? (key === "birth_date" ? formatDate((user as any)[key]) : (user as any)[key]) : <span className="text-muted-foreground">—</span>}</p>
                    )}
                  </div>
                ))}
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Rola</Label>
                  {editingProfile ? (
                    <Select value={profileForm.role} onValueChange={(v) => setProfileForm({ ...profileForm, role: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Pracownik</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{user.role === "hr" ? "HR" : user.role === "manager" ? "Manager" : "Pracownik"}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-muted-foreground">Przełożony</Label>
                  {editingProfile ? (
                    <Select value={profileForm.manager_id} onValueChange={(v) => setProfileForm({ ...profileForm, manager_id: v })}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Brak" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm">{user.manager_name || <span className="text-muted-foreground">—</span>}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border">
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-semibold">Dane do umów</CardTitle>
              </CardHeader>
              <CardContent className="px-5 pb-4 flex flex-col gap-3">
                {[
                  { label: "PESEL", key: "pesel" },
                  { label: "NIP", key: "nip" },
                  { label: "Numer konta bankowego", key: "bank_account" },
                ].map(({ label, key }) => (
                  <div key={key} className="flex flex-col gap-1">
                    <Label className="text-xs text-muted-foreground">{label}</Label>
                    {editingProfile ? (
                      <Input
                        value={(profileForm as any)[key]}
                        onChange={(e) => setProfileForm({ ...profileForm, [key]: e.target.value })}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <p className="text-sm font-mono">{(user as any)[key] || <span className="text-muted-foreground font-sans">—</span>}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contracts tab */}
        <TabsContent value="contracts">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Umowy</h2>
            {isEditable && (
              <Button size="sm" onClick={() => setContractDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Dodaj umowę
              </Button>
            )}
          </div>
          {contracts.length === 0 ? (
            <Card className="border"><CardContent className="p-6 text-center text-sm text-muted-foreground">Brak umów</CardContent></Card>
          ) : (
            <div className="flex flex-col gap-2">
              {contracts.map((c) => (
                <Card key={c.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{c.contract_type}</p>
                          {c.is_active && <Badge className="bg-success/15 text-success border-success/30 text-xs" variant="outline">Aktywna</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {contractLabels[c.salary_type]}: {c.salary_amount} PLN
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(c.start_date)}{c.end_date ? ` – ${formatDate(c.end_date)}` : " – czas nieokreślony"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Leave tab */}
        <TabsContent value="leave">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Saldo urlopów {year}</h2>
            {isEditable && (
              <Button size="sm" onClick={() => setAllowanceDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Ustaw saldo
              </Button>
            )}
          </div>
          {allowances.length === 0 ? (
            <Card className="border"><CardContent className="p-6 text-center text-sm text-muted-foreground">Brak przyznanych dni urlopowych</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allowances.map((a) => {
                const total = Number(a.total_days) + Number(a.carried_over_days)
                const used = Number(a.used_days)
                const remaining = total - used
                return (
                  <Card key={a.id} className="border">
                    <CardContent className="p-4">
                      <p className="text-sm font-medium mb-1">{a.leave_type_name}</p>
                      <p className="text-xs text-muted-foreground">{a.is_paid ? "Płatny" : "Bezpłatny"}</p>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-lg font-bold">{Number(a.total_days)}</p>
                          <p className="text-xs text-muted-foreground">Przyznano</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-primary">{used}</p>
                          <p className="text-xs text-muted-foreground">Wykorzystano</p>
                        </div>
                        <div>
                          <p className="text-lg font-bold text-success">{remaining}</p>
                          <p className="text-xs text-muted-foreground">Zostało</p>
                        </div>
                      </div>
                      {Number(a.carried_over_days) > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 text-center">+{Number(a.carried_over_days)} przeniesione</p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Allowance dialog */}
      <Dialog open={allowanceDialog} onOpenChange={setAllowanceDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Przyznaj dni urlopowe</DialogTitle></DialogHeader>
          <form onSubmit={saveAllowance} className="flex flex-col gap-3 mt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Rodzaj urlopu</Label>
              <Select value={allowanceForm.leave_type_id} onValueChange={(v) => setAllowanceForm({ ...allowanceForm, leave_type_id: v })} required>
                <SelectTrigger><SelectValue placeholder="Wybierz" /></SelectTrigger>
                <SelectContent>
                  {leaveTypes.map((t: any) => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Liczba dni</Label>
                <Input type="number" min={0} value={allowanceForm.total_days} onChange={(e) => setAllowanceForm({ ...allowanceForm, total_days: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Rok</Label>
                <Input type="number" value={allowanceForm.year} onChange={(e) => setAllowanceForm({ ...allowanceForm, year: e.target.value })} required />
              </div>
            </div>
            <Button type="submit">Zapisz</Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Contract dialog */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nowa umowa</DialogTitle></DialogHeader>
          <form onSubmit={saveContract} className="flex flex-col gap-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Typ umowy</Label>
                <Select value={contractForm.contract_type} onValueChange={(v) => setContractForm({ ...contractForm, contract_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["UoP", "B2B", "UoZ", "Zlecenie"].map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Typ stawki</Label>
                <Select value={contractForm.salary_type} onValueChange={(v) => setContractForm({ ...contractForm, salary_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Miesięczna</SelectItem>
                    <SelectItem value="hourly">Godzinowa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Kwota (PLN)</Label>
              <Input type="number" step="0.01" value={contractForm.salary_amount} onChange={(e) => setContractForm({ ...contractForm, salary_amount: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Data rozpoczęcia</Label>
                <Input type="date" value={contractForm.start_date} onChange={(e) => setContractForm({ ...contractForm, start_date: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Data zakończenia</Label>
                <Input type="date" value={contractForm.end_date} onChange={(e) => setContractForm({ ...contractForm, end_date: e.target.value })} />
              </div>
            </div>
            <Button type="submit">Zapisz umowę</Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
