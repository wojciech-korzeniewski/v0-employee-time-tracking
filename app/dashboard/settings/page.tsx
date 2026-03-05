import { getSession } from "@/lib/session"
import { redirect } from "next/navigation"
import sql from "@/lib/db"
import { SettingsClient } from "./settings-client"

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  if (session.role !== "hr") redirect("/dashboard")

  const leaveTypes = await sql`SELECT * FROM leave_types ORDER BY name`
  const settings = await sql`SELECT key, value FROM settings`

  const settingsMap: Record<string, string> = {}
  for (const s of settings) {
    settingsMap[(s as any).key] = (s as any).value || ""
  }

  return (
    <SettingsClient
      leaveTypes={leaveTypes as any}
      settings={settingsMap}
    />
  )
}
