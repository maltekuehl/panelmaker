import { Prisma } from "@/lib/generated/prisma/client"
import { logger } from "@/lib/monitoring"
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

/**
 * Sanitizes error messages to prevent information disclosure
 * In production, returns generic messages unless explicitly allowed
 */
export function sanitizeError(error: unknown, includeDetails = false): string {
  // In production, return generic messages by default
  if (process.env.NODE_ENV === "production" && !includeDetails) {
    if (error instanceof z.ZodError) {
      return "Validation error"
    }
    if (error instanceof ApiException) {
      return error.apiError.message // Only user-facing message
    }
    const prismaMapping = prismaErrorMapping(error)
    if (prismaMapping) {
      return prismaMapping.message
    }
    if (error instanceof Error) {
      // Check for known safe error messages
      const safeMessages = [
        "Authentication required",
        "Admin access required",
        "Unauthorized",
        "Not found",
        "Resource not found",
        "Invalid credentials",
      ]

      if (safeMessages.some((msg) => error.message.includes(msg))) {
        return error.message
      }

      // Generic error for everything else
      return "An error occurred"
    }
    return "An error occurred"
  }

  // In development or when details are explicitly requested
  if (error instanceof Error) {
    // Remove sensitive information patterns from error messages
    let message = error.message

    // Remove database connection strings (PostgreSQL only - we don't use MongoDB)
    message = message.replace(/postgresql:\/\/[^\s]+/g, "[DATABASE_URL]")

    // Remove API keys and tokens (be more aggressive to prevent leaking user API keys)
    message = message.replace(/Bearer\s+[a-zA-Z0-9_-]+/gi, "Bearer [REDACTED]")
    message = message.replace(/api[_-]?key[:\s=]+[a-zA-Z0-9_-]+/gi, "api_key: [REDACTED]")
    message = message.replace(/token[:\s=]+[a-zA-Z0-9_-]+/gi, "token: [REDACTED]")
    // Remove any potential API keys (32+ char hex strings that might be keys)
    message = message.replace(/[a-f0-9]{32,}/gi, "[KEY_REDACTED]")

    // Remove file paths
    message = message.replace(/\/[^\s]+\/(node_modules|lib|app|src)/g, "/[PATH]/$1")

    return message
  }

  return String(error)
}

/**
 * Gets appropriate HTTP status code for an error
 */
export function getErrorStatusCode(error: unknown): number {
  if (error instanceof ApiException) {
    return error.statusCode
  }

  if (error instanceof z.ZodError) {
    return 400
  }

  const prismaMapping = prismaErrorMapping(error)
  if (prismaMapping) {
    return prismaMapping.status
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase()

    if (message.includes("not found")) {
      return 404
    }
    if (message.includes("unauthorized") || message.includes("authentication required")) {
      return 401
    }
    if (message.includes("admin access required") || message.includes("forbidden")) {
      return 403
    }
    if (message.includes("duplicate") || message.includes("unique constraint")) {
      return 409
    }
    if (message.includes("rate limit")) {
      return 429
    }
  }

  return 500
}

/**
 * Creates a standardized error response with sanitized messages
 */
export function createErrorResponse(error: unknown, defaultMessage = "Internal server error"): NextResponse {
  logger.error("API error", error instanceof Error ? error : new Error(String(error)))

  const statusCode = getErrorStatusCode(error)
  const sanitizedMessage = sanitizeError(error)

  // Handle Zod validation errors with more detail
  if (error instanceof z.ZodError) {
    // In production, only return field names, not values
    const sanitizedErrors =
      process.env.NODE_ENV === "production"
        ? error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          }))
        : error.errors

    return NextResponse.json(
      {
        error: "Validation error",
        details: sanitizedErrors,
      },
      { status: 400 },
    )
  }

  // Handle custom API exceptions
  if (error instanceof ApiException) {
    return NextResponse.json(
      {
        error: error.apiError.message,
        code: error.apiError.code,
        // Only include details in development or if explicitly allowed
        ...(process.env.NODE_ENV !== "production" && { details: error.apiError.details }),
      },
      { status: error.statusCode },
    )
  }

  // Default error response
  return NextResponse.json(
    {
      error: sanitizedMessage || defaultMessage,
      // In development, include more context
      ...(process.env.NODE_ENV !== "production" && {
        type: error instanceof Error ? error.name : typeof error,
      }),
    },
    { status: statusCode },
  )
}

export function createSuccessResponse(data: any, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Wraps a route handler so anything it throws becomes a standard error response.
 * Replaces the hand-rolled try/catch plus `error.message === "..."` checks in route files:
 * throw ApiException (or NotFoundError/ForbiddenError/ConflictError/UnprocessableError) from the
 * model layer and the status, code and user-facing message come through untouched.
 */
export function withApiErrors<TArgs extends unknown[]>(
  handler: (...args: TArgs) => Promise<NextResponse>,
  defaultMessage = "Internal server error",
): (...args: TArgs) => Promise<NextResponse> {
  return async (...args: TArgs) => {
    try {
      return await handler(...args)
    } catch (error) {
      return createErrorResponse(error, defaultMessage)
    }
  }
}
