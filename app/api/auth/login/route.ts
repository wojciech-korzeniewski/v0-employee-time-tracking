import { NextRequest, NextResponse } from "next/server"
import { login } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { login: loginId, password } = await req.json()
  const result = await login(loginId, password)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}
