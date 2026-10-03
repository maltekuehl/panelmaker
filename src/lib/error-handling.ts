import { Prisma } from "@/lib/generated/prisma/client"
import { logger } from "@/lib/monitoring"
import { unstable_rethrow } from "next/navigation"
import { NextResponse } from "next/server"
import { z } from "zod"

export interface ApiError {
  message: string
  code?: string
  details?: any
}

export class ApiException extends Error {
  constructor(
    public statusCode: number,
    public apiError: ApiError,
  ) {
    super(apiError.message)
    this.name = "ApiException"
  }
}

export class BadRequestError extends ApiException {
  constructor(message: string, code?: string, details?: unknown) {
    super(400, { message, code, details })
    this.name = "BadRequestError"
  }
}

export class UnauthorizedError extends ApiException {
  constructor(message = "Authentication required", code?: string) {
    super(401, { message, code })
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends ApiException {
  constructor(message: string, code?: string) {
    super(403, { message, code })
    this.name = "ForbiddenError"
  }
}

export class NotFoundError extends ApiException {
  constructor(message = "Resource not found", code?: string) {
    super(404, { message, code })
    this.name = "NotFoundError"
  }
}

export class ConflictError extends ApiException {
  constructor(message: string, code?: string, details?: unknown) {
    super(409, { message, code, details })
    this.name = "ConflictError"
  }
}

export class UnprocessableError extends ApiException {
  constructor(message: string, code?: string, details?: unknown) {
    super(422, { message, code, details })
    this.name = "UnprocessableError"
  }
}

// Prisma constraint failures that have a meaningful HTTP answer. Anything else stays a 500.
const PRISMA_ERROR_MAP: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: "That value is already taken" },
  P2003: { status: 400, message: "Referenced record does not exist" },
  P2025: { status: 404, message: "Resource not found" },
}

function prismaErrorMapping(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return null
  return PRISMA_ERROR_MAP[error.code] ?? null
}

function redactMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error)
  return error.message
    .replace(/postgresql:\/\/[^\s]+/g, "[DATABASE_URL]")
    .replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, "Bearer [REDACTED]")
    .replace(/api[_-]?key[:\s=]+[a-zA-Z0-9_-]+/gi, "api_key: [REDACTED]")
    .replace(/token[:\s=]+[a-zA-Z0-9_-]+/gi, "token: [REDACTED]")
    .replace(/[a-f0-9]{32,}/gi, "[KEY_REDACTED]")
    .replace(/\/[^\s]+\/(node_modules|lib|app|src)/g, "/[PATH]/$1")
}

// Unknown errors become a 500 carrying the caller's default message in production and a redacted
// message in development, so internals never reach a production client.
export function createErrorResponse(error: unknown, defaultMessage = "Internal server error"): NextResponse {
  unstable_rethrow(error)
  logger.error("API error", error instanceof Error ? error : new Error(String(error)))
  const isProduction = process.env.NODE_ENV === "production"

  if (error instanceof z.ZodError) {
    const details = isProduction
      ? error.errors.map((err) => ({ field: err.path.join("."), message: err.message }))
      : error.errors
    return NextResponse.json({ error: "Validation error", details }, { status: 400 })
  }

  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        error: error.apiError.message,
        code: error.apiError.code,
        ...(!isProduction && { details: error.apiError.details }),
      },
      { status: error.statusCode },
    )
  }

  const prismaMapping = prismaErrorMapping(error)
  if (prismaMapping) {
    return NextResponse.json(
      { error: isProduction ? prismaMapping.message : redactMessage(error) },
      { status: prismaMapping.status },
    )
  }

  return NextResponse.json(
    {
      error: isProduction ? defaultMessage : redactMessage(error) || defaultMessage,
      ...(!isProduction && { type: error instanceof Error ? error.name : typeof error }),
    },
    { status: 500 },
  )
}

export function createSuccessResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}
