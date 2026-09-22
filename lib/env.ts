import "server-only"
import { z } from "zod"

// Define the schema for environment variables
const envSchema = z.object({
  // URL
  NEXT_PUBLIC_BASE_URL: z.string().url("NEXT_PUBLIC_BASE_URL must be a valid URL"),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Authentication
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  AUTH_DEBUG: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // OAuth Providers (optional: email/password is the primary auth method)
  AUTH_GITHUB_ID: z.string().optional(),
  AUTH_GITHUB_SECRET: z.string().optional(),
  AUTH_LINKEDIN_ID: z.string().optional(),
  AUTH_LINKEDIN_SECRET: z.string().optional(),

  // External APIs (optional: the app runs without them, the features that need them are disabled)
  GEMINI_API_KEY: z.string().optional(),
  SCICRUNCH_API_KEY: z.string().optional(),

  // Image storage (local disk, served by nginx from a shared volume)
  UPLOADS_DIR: z.string().default("./data/uploads"),

  // Encryption at rest for stored API credentials (AES-256-GCM key material).
  // Optional: only required once users start saving their own provider API keys.
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),

  // Optional
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_TEST_MODE: z.string().optional().default("false"),
})

export type Environment = z.infer<typeof envSchema>

// Validate environment variables
export function validateEnvironment(): Environment {
  const parsed = envSchema.safeParse(process.env)
  if (parsed.success) return parsed.data

  console.error("❌ Environment variable validation failed:")
  parsed.error.errors.forEach((err) => {
    console.error(`  - ${err.path.join(".")}: ${err.message}`)
  })

  if (process.env.NODE_ENV === "production") {
    throw new Error("Environment validation failed in production")
  }

  console.warn("⚠️  Continuing in development mode despite validation errors")
  // Keeps `env` honest about the keys that carry a default or a transform, so callers stay type-safe.
  return {
    ...process.env,
    AUTH_DEBUG: process.env.AUTH_DEBUG === "true",
    UPLOADS_DIR: process.env.UPLOADS_DIR || "./data/uploads",
    NODE_ENV: (process.env.NODE_ENV as Environment["NODE_ENV"]) || "development",
    NEXT_PUBLIC_TEST_MODE: process.env.NEXT_PUBLIC_TEST_MODE || "false",
  } as Environment
}

// Type-safe environment access
export const env: Environment = validateEnvironment()
