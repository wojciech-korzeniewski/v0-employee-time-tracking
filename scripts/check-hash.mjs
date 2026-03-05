import { createHash } from "crypto"

const hash = createHash("sha256").update("admin123").digest("hex")
console.log("SHA-256 of admin123:", hash)
console.log("Length:", hash.length)
