"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Calendar,
  Umbrella,
  Users,
  CheckSquare,
  BarChart3,
  Settings,
  UserCircle,
  Clock,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

type SessionUser = {
  id: number
  login: string
  role: "employee" | "manager" | "hr"
  full_name: string
  email: string | null
}

const navItems = {
  employee: [
    { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: "Harmonogram", icon: Calendar },
    { href: "/dashboard/leave", label: "Urlopy", icon: Umbrella },
    { href: "/dashboard/profile", label: "Mój profil", icon: UserCircle },
  ],
  manager: [
    { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: "Harmonogram", icon: Calendar },
    { href: "/dashboard/leave", label: "Urlopy", icon: Umbrella },
    { href: "/dashboard/team", label: "Mój zespół", icon: Users },
    { href: "/dashboard/approvals", label: "Akceptacje", icon: CheckSquare },
    { href: "/dashboard/profile", label: "Mój profil", icon: UserCircle },
  ],
  hr: [
    { href: "/dashboard", label: "Pulpit", icon: LayoutDashboard },
    { href: "/dashboard/schedule", label: "Harmonogram", icon: Calendar },
    { href: "/dashboard/leave", label: "Urlopy", icon: Umbrella },
    { href: "/dashboard/team", label: "Pracownicy", icon: Users },
    { href: "/dashboard/approvals", label: "Akceptacje", icon: CheckSquare },
    { href: "/dashboard/reports", label: "Raporty", icon: BarChart3 },
    { href: "/dashboard/settings", label: "Ustawienia", icon: Settings },
    { href: "/dashboard/profile", label: "Mój profil", icon: UserCircle },
  ],
}

const roleLabels = {
  employee: "Pracownik",
  manager: "Manager",
  hr: "HR",
}

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname()
  const router = useRouter()
  const items = navItems[user.role]

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  const initials = user.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="flex flex-col w-60 min-h-screen bg-sidebar text-sidebar-foreground border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <Clock className="h-4 w-4 text-sidebar-primary-foreground" />
        </div>
        <span className="font-bold text-lg tracking-tight text-sidebar-foreground">WorkTime</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-sidebar-primary" : "")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User menu */}
      <div className="px-3 pb-4 border-t border-sidebar-border pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="w-full flex items-center gap-3 px-3 py-2.5 h-auto justify-start hover:bg-sidebar-accent text-sidebar-foreground hover:text-sidebar-foreground rounded-lg"
            >
              <Avatar className="h-7 w-7 shrink-0">
                <AvatarFallback className="text-xs bg-sidebar-primary text-sidebar-primary-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-left min-w-0">
                <span className="text-sm font-medium truncate w-full">{user.full_name}</span>
                <span className="text-xs text-sidebar-foreground/60">{roleLabels[user.role]}</span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 ml-auto text-sidebar-foreground/40" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile">Mój profil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Wyloguj się
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  )
}
