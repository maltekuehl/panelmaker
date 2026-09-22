import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // A placeholder keeps `prisma generate` (and so `npm install`) working on a fresh clone with no .env.
    // Generate never connects; a real command fails at connect time with the placeholder host in the error.
    url: process.env.DATABASE_URL ?? "postgresql://unset:unset@localhost:5432/unset",
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
})
