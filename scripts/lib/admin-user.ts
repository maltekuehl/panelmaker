import { normalizeEmail } from "@/models/user/transforms"
import bcrypt from "bcryptjs"
import { randomBytes } from "node:crypto"
import type { PrismaClient } from "../../lib/generated/prisma/client"

// Same cost factor as app/api/auth/register/route.ts, so accounts created here sign in through the
// regular credentials provider in auth.ts.
const PASSWORD_HASH_ROUNDS = 12
export const MIN_PASSWORD_LENGTH = 12
const MAX_PASSWORD_LENGTH = 128

export function generatePassword(): string {
  return randomBytes(18).toString("base64url")
}

export function assertAcceptablePassword(password: string): void {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`)
  }
}

export type AdminUserInput = { email: string; name: string | null; password: string | null }

export type AdminUserResult = { id: string; email: string; created: boolean; passwordSet: boolean }

// Creates an active ADMIN, or promotes an existing account. An existing password is only
// replaced when a new one is passed in.
export async function upsertAdminUser(prisma: PrismaClient, input: AdminUserInput): Promise<AdminUserResult> {
  const email = normalizeEmail(input.email)
  const passwordHash = input.password ? await bcrypt.hash(input.password, PASSWORD_HASH_ROUNDS) : null
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } })

  const privileges = { role: "ADMIN" as const, status: "ACTIVE" as const }

  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        ...privileges,
        ...(input.name ? { name: input.name } : {}),
        ...(passwordHash ? { password: passwordHash } : {}),
      },
    })
    return { id: existing.id, email, created: false, passwordSet: passwordHash !== null }
  }

  const created = await prisma.user.create({
    data: { ...privileges, email, name: input.name, password: passwordHash },
    select: { id: true },
  })
  return { id: created.id, email, created: true, passwordSet: passwordHash !== null }
}
