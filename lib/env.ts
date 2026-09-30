import "server-only"
import { z } from "zod"

function emptyToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value
}

const optionalString = z.preprocess(emptyToUndefined, z.string().trim().optional())

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

  // AI assistant: instance-wide provider keys set by the operator (names follow the AI SDK defaults).
  // All optional. Users and labs can add their own keys, which take precedence over these.
  GOOGLE_GENERATIVE_AI_API_KEY: optionalString,
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  // Default chat model in provider:model form, e.g. "anthropic:claude-sonnet-5-5".
  AI_DEFAULT_MODEL: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .regex(/^(google|openai|anthropic):\S+$/, "AI_DEFAULT_MODEL must look like provider:model")
      .optional(),
  ),
  // Requests per user per 24 hours on the instance keys. 0 means unlimited. Defaults to 200.
  AI_INSTANCE_DAILY_LIMIT: z.preprocess(emptyToUndefined, z.coerce.number().int().min(0).optional()),

  // External APIs (optional: the app runs without them, the features that need them are disabled)
  SCICRUNCH_API_KEY: z.string().optional(),

  // Image storage (local disk, served by nginx from a shared volume)
  UPLOADS_DIR: z.string().default("./data/uploads"),

  // Encryption at rest for stored API credentials (AES-256-GCM key material).
  // Optional: only required once users start saving their own provider API keys.
  ENCRYPTION_KEY: z.string().min(32, "ENCRYPTION_KEY must be at least 32 characters").optional(),

  // Instance configuration (self-hosted deployments). All optional: the app runs with generic
  // defaults / placeholder notices when unset. Server-side only, never NEXT_PUBLIC_, because a
  // single Docker image must be able to serve any institution without a rebuild.
  INSTANCE_NAME: z.string().optional(),
  INSTANCE_INSTITUTION: z.string().optional(),
  INSTANCE_OPERATOR: z.string().optional(),
  INSTANCE_ADDRESS: z.string().optional(),
  INSTANCE_CONTACT_EMAIL: z.string().email("INSTANCE_CONTACT_EMAIL must be a valid email").optional(),
  INSTANCE_CONFIG_DIR: z.string().default("./config"),
  // Search engine indexing is opt-in. Unless "true", robots.txt disallows everything, the sitemap is
  // empty and every page is served as noindex, nofollow.
  INSTANCE_ALLOW_INDEXING: z
    .string()
    .optional()
    .transform((val) => val?.trim().toLowerCase() === "true"),

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
    INSTANCE_CONFIG_DIR: process.env.INSTANCE_CONFIG_DIR || "./config",
    INSTANCE_ALLOW_INDEXING: process.env.INSTANCE_ALLOW_INDEXING?.trim().toLowerCase() === "true",
    NODE_ENV: (process.env.NODE_ENV as Environment["NODE_ENV"]) || "development",
    NEXT_PUBLIC_TEST_MODE: process.env.NEXT_PUBLIC_TEST_MODE || "false",
  } as Environment
}

// Type-safe environment access
export const env: Environment = validateEnvironment()
