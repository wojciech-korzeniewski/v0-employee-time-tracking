import postgres from "postgres"

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error(
    "DATABASE_URL is not set. In Railway: add PostgreSQL service and link it to this app."
  )
}

const sql = postgres(url, {
  max: 1,
  ssl: url.includes("railway") ? "require" : undefined,
})

export default sql
