"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

const MONTHS_PL = ["Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień"]

type Props = {
  scheduleData: { id: number; full_name: string; total_minutes: number }[]
  leaveSummary: { id: number; full_name: string; leave_type_name: string; total_days: number; used_days: number; carried_over_days: number }[]
  month: number
  year: number
  users: { id: number; full_name: string }[]
}

export function ReportsClient({ scheduleData, leaveSummary, month, year }: Props) {
  const chartData = scheduleData.map((u) => ({
    name: u.full_name.split(" ")[0],
    fullName: u.full_name,
    hours: Math.round((Number(u.total_minutes) / 60) * 10) / 10,
  }))

  // Group leave summary by user
  const leaveByUser = leaveSummary.reduce((acc: Record<string, any>, row) => {
    if (!acc[row.full_name]) acc[row.full_name] = { full_name: row.full_name, leaves: [] }
    acc[row.full_name].leaves.push(row)
    return acc
  }, {})

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Raporty HR</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Przegląd godzin i urlopów</p>
      </div>

      <Tabs defaultValue="hours">
        <TabsList className="mb-5">
          <TabsTrigger value="hours">Godziny pracy</TabsTrigger>
          <TabsTrigger value="leave">Urlopy {year}</TabsTrigger>
        </TabsList>

        <TabsContent value="hours">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {MONTHS_PL[month - 1]} {year}
            </h2>
            <Badge variant="secondary">
              Suma: {scheduleData.reduce((s, u) => s + Math.round(Number(u.total_minutes) / 60 * 10) / 10, 0)}h
            </Badge>
          </div>

          {chartData.length > 0 && (
            <Card className="border mb-4">
              <CardContent className="p-4 pt-5">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} />
                    <YAxis tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} unit="h" />
                    <Tooltip
                      formatter={(val: any) => [`${val}h`, "Godziny"]}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Bar dataKey="hours" radius={[4, 4, 0, 0]}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={`oklch(0.45 0.18 ${240 + i * 15})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {scheduleData.map((u) => {
              const hours = Math.round(Number(u.total_minutes) / 60 * 10) / 10
              const target = 168 // ~21 working days * 8h
              const pct = Math.min(100, Math.round((hours / target) * 100))
              const initials = u.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <Card key={u.id} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium truncate">{u.full_name}</p>
                          <span className="text-sm font-bold shrink-0 ml-2">{hours}h</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="leave">
          <div className="flex flex-col gap-3">
            {Object.values(leaveByUser).map((userData: any) => {
              const initials = userData.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
              return (
                <Card key={userData.full_name} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">{initials}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-semibold">{userData.full_name}</p>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {userData.leaves.map((l: any) => {
                        const total = Number(l.total_days) + Number(l.carried_over_days)
                        const remaining = total - Number(l.used_days)
                        return (
                          <div key={l.leave_type_name} className="bg-muted rounded-lg p-2.5">
                            <p className="text-xs text-muted-foreground mb-1 truncate">{l.leave_type_name}</p>
                            <div className="flex items-baseline gap-1">
                              <span className="text-sm font-bold">{remaining}</span>
                              <span className="text-xs text-muted-foreground">/ {total}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {Object.keys(leaveByUser).length === 0 && (
              <Card className="border">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Brak danych urlopowych
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
