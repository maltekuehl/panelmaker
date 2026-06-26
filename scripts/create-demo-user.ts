// Creates (or updates) a local demo login you can sign in with via email/password.
// Idempotent and non-destructive: safe to re-run. After a full `prisma db seed` (which resets the
// DB) re-run this to recreate the demo user: `npm run seed:demo-user`.
//
// The demo user is VERIFIED (can submit reports and create labs) and ADMIN (can reach /admin), and
// is made an OWNER of the seeded Puelles lab so the lab features are populated on first sign-in.
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import "dotenv/config"
import { writeFileSync } from "node:fs"
import path from "node:path"
import { PrismaClient } from "../lib/generated/prisma/client"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

const DEMO_EMAIL = "demo@panelmaker.local"
const DEMO_PASSWORD = process.env.DEMO_USER_PASSWORD ?? "PanelMakerDemo2026!"
const DEMO_NAME = "Demo User"
const HOME_LAB_ID = "seed_lab_puelles"

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { name: DEMO_NAME, password: passwordHash, role: "ADMIN", status: "ACTIVE", accessStatus: "VERIFIED" },
    create: {
      name: DEMO_NAME,
      email: DEMO_EMAIL,
      password: passwordHash,
      role: "ADMIN",
      status: "ACTIVE",
      accessStatus: "VERIFIED",
    },
    select: { id: true },
  })

  const homeLab = await prisma.lab.findUnique({
    where: { id: HOME_LAB_ID },
    select: { id: true, name: true, slug: true },
  })

  let labNote = "No seeded lab found yet. Run `npx prisma db seed` to create the demo labs, then re-run this script."
  if (homeLab) {
    await prisma.labMembership.upsert({
      where: { userId_labId: { userId: user.id, labId: homeLab.id } },
      update: { role: "OWNER" },
      create: { userId: user.id, labId: homeLab.id, role: "OWNER" },
    })
    labNote = `Owner of the "${homeLab.name}" lab at /labs/${homeLab.slug} (dashboard, members, settings, and antibody inventory).`
  }

  const lines = [
    "PanelMaker - local demo login",
    "================================",
    "",
    `URL:      http://localhost:3000/signin  (choose "Email and Password")`,
    `Email:    ${DEMO_EMAIL}`,
    `Password: ${DEMO_PASSWORD}`,
    "",
    "Account: role=ADMIN, verified access (can submit reports and create labs).",
    labNote,
    "",
    "This is a LOCAL development account against your dev database only.",
    "This file is gitignored. Re-run `npm run seed:demo-user` to recreate after a full re-seed.",
    "",
  ]

  const outPath = path.resolve(process.cwd(), "DEMO_CREDENTIALS.txt")
  writeFileSync(outPath, lines.join("\n"), "utf8")

  console.log(`Demo user ready: ${DEMO_EMAIL}`)
  console.log(`Credentials written to ${outPath}`)
  console.log(labNote)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
