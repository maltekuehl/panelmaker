import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/lib/generated/prisma/client"

export function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
  return new PrismaClient({ adapter })
}

export async function runScript(main: (prisma: PrismaClient) => Promise<void>): Promise<void> {
  const prisma = createPrismaClient()
  try {
    await main(prisma)
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}
