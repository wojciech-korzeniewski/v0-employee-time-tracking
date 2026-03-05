"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Plus, Search, UserCircle, Mail, Phone, Shield, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"

type User = {
  id: number
  login: string
  full_name: string
  email: string | null
  phone: string | null
  role: string
  manager_id: number | null
  manager_name: string | null
}

type Props = {
  users: User[]
  managers: { id: number; full_name: string }[]
  currentRole: string
}

const roleLabels: Record<string, string> = {
  employee: "Pracownik",
  manager: "Manager",
  hr: "HR",
}

const roleColors: Record<string, string> = {
  employee: "bg-secondary text-secondary-foreground",
  manager: "bg-primary/10 text-primary",
  hr: "bg-accent/10 text-accent",
}

export function TeamClient({ users, managers, currentRole }: Props) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    login: "", password: "", full_name: "", email: "", phone: "",
    role: "employee", manager_id: "",
  })

  const filtered = users.filter((u) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.login.toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      toast.success("Pracownik dodany")
      setOpen(false)
      setForm({ login: "", password: "", full_name: "", email: "", phone: "", role: "employee", manager_id: "" })
      router.refresh()
    } else {
      const data = await res.json()
      toast.error(data.error || "Błąd tworzenia użytkownika")
    }
    setSubmitting(false)
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {currentRole === "hr" ? "Pracownicy" : "Mój zespół"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{users.length} osób</p>
        </div>
        {currentRole === "hr" && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1.5" />Dodaj pracownika</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nowy pracownik</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex flex-col gap-3 mt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Imię i nazwisko *</Label>
                    <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Login *</Label>
                    <Input value={form.login} onChange={(e) => setForm({ ...form, login: e.target.value })} required />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Hasło *</Label>
                  <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Telefon</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label>Rola *</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="employee">Pracownik</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="hr">HR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label>Przełożony</Label>
                    <Select value={form.manager_id} onValueChange={(v) => setForm({ ...form, manager_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Brak" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Brak</SelectItem>
                        {managers.map((m) => (
                          <SelectItem key={m.id} value={String(m.id)}>{m.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" disabled={submitting} className="mt-1">
                  {submitting ? "Tworzenie..." : "Utwórz konto"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Szukaj pracownika..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {filtered.map((user) => {
          const initials = user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
          return (
            <Link key={user.id} href={`/dashboard/team/${user.id}`}>
              <Card className="border hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{user.full_name}</p>
                        <Badge className={`text-xs px-1.5 py-0.5 ${roleColors[user.role]}`} variant="secondary">
                          {roleLabels[user.role]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">@{user.login}</p>
                      {user.email && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {user.email}
                        </p>
                      )}
                      {user.manager_name && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Shield className="h-3 w-3" />
                          {user.manager_name}
                        </p>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <Card className="border">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nie znaleziono pracownika
          </CardContent>
        </Card>
      )}
    </div>
  )
}
