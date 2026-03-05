import { cookies } from "next/headers"
import sql from "./db"

export type SessionUser = {
  id: number
  login: string
  role: "employee" | "manager" | "hr"
  full_name: string
  email: string | null
  manager_id: number | null
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get("session_id")?.value
  if (!sessionId) return null

  const rows = await sql`
    SELECT id, login, role, full_name, email, manager_id
    FROM users
    WHERE id = ${parseInt(sessionId)}
  `
  if (!rows.length) return null
  return rows[0] as SessionUser
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) {
    throw new Error("UNAUTHORIZED")
  }
  return session
}

export async function requireRole(
  ...roles: Array<"employee" | "manager" | "hr">
): Promise<SessionUser> {
  const session = await requireSession()
  if (!roles.includes(session.role)) {
    throw new Error("FORBIDDEN")
  }
  return session
}
