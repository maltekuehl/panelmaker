// Creates the first administrator of an instance, or promotes an existing account to ADMIN.
// The account is ACTIVE with the ADMIN role (can submit reports, create labs and reach /admin).
//
//   npm run admin:create -- --email admin@example.edu --name "Ada Admin"
//
// Password: taken from ADMIN_PASSWORD when set, otherwise a strong random one is generated and printed
// once to stdout. It is never written to disk. For an existing account the password is left untouched
// unless ADMIN_PASSWORD is set or --reset-password is passed.
import { normalizeEmail } from "@/models/user/transforms"
import "dotenv/config"
import { parseArgs } from "node:util"
import { z } from "zod"
import { runScript } from "../prisma/client"
import { assertAcceptablePassword, generatePassword, upsertAdminUser } from "./lib/admin-user"

const USAGE = 'Usage: npm run admin:create -- --email <email> [--name "<name>"] [--reset-password]'

type AdminInput = { email: string; name: string | null; password: string | null; resetPassword: boolean }

function readInput(): AdminInput | null {
  const { values } = parseArgs({
    options: {
      "email": { type: "string" },
      "name": { type: "string" },
      "reset-password": { type: "boolean", default: false },
      "help": { type: "boolean", default: false },
    },
  })

  if (values.help) {
    console.log(USAGE)
    console.log("Set ADMIN_PASSWORD to choose the password instead of generating one.")
    return null
  }

  const email = z
    .string()
    .trim()
    .email()
    .safeParse(values.email ?? process.env.ADMIN_EMAIL)
  if (!email.success) throw new Error(`A valid email is required. ${USAGE}`)

  const password = process.env.ADMIN_PASSWORD || null
  if (password) assertAcceptablePassword(password)

  return {
    email: email.data,
    name: (values.name ?? process.env.ADMIN_NAME)?.trim() || null,
    password,
    resetPassword: values["reset-password"],
  }
}

async function main(): Promise<void> {
  let input: ReturnType<typeof readInput>
  try {
    input = readInput()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
    return
  }
  if (!input) return
  const { email, name, password: suppliedPassword, resetPassword } = input

  await runScript(async (prisma) => {
    const existing = await prisma.user.findUnique({ where: { email: normalizeEmail(email) }, select: { id: true } })
    const needsGeneratedPassword = !suppliedPassword && (!existing || resetPassword)
    const generatedPassword = needsGeneratedPassword ? generatePassword() : null

    const result = await upsertAdminUser(prisma, { email, name, password: suppliedPassword ?? generatedPassword })

    console.log(result.created ? `Created admin account ${result.email}.` : `Promoted ${result.email} to admin.`)
    if (generatedPassword) {
      console.log("")
      console.log(`  Email:    ${result.email}`)
      console.log(`  Password: ${generatedPassword}`)
      console.log("")
      console.log("This password is shown once and is not stored anywhere. Keep it in a password manager.")
      console.log("Run again with --reset-password to issue a new one.")
    } else if (suppliedPassword) {
      console.log("Password set from ADMIN_PASSWORD.")
    } else {
      console.log("Existing password kept. Pass --reset-password to generate a new one.")
    }
  })
}

void main()
