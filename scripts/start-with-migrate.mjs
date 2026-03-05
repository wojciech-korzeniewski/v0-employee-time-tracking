#!/usr/bin/env node
import { spawn } from "child_process"

if (process.env.DATABASE_URL) {
  const mig = spawn("node", ["scripts/run-migrate.mjs"], {
    stdio: "inherit",
    cwd: process.cwd(),
  })
  mig.on("exit", (code) => {
    if (code !== 0) console.error("Migration failed, starting anyway.")
    const next = spawn("npm", ["run", "start:next"], { stdio: "inherit", cwd: process.cwd() })
    next.on("exit", (c) => process.exit(c ?? 0))
  })
} else {
  const next = spawn("npm", ["run", "start:next"], { stdio: "inherit", cwd: process.cwd() })
  next.on("exit", (c) => process.exit(c ?? 0))
}
