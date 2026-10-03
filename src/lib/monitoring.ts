import { prisma } from "@/lib/prisma"

interface LogContext {
  userId?: string
  requestId?: string
  ip?: string
  userAgent?: string
  endpoint?: string
  method?: string
  [key: string]: any
}

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private logLevel: LogLevel

  constructor() {
    // Set log level based on environment
    this.logLevel = process.env.NODE_ENV === "production" ? LogLevel.INFO : LogLevel.DEBUG
  }

  private formatMessage(level: string, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString()
    const baseLog = {
      timestamp,
      level,
      message,
      environment: process.env.NODE_ENV,
      ...context,
    }

    return JSON.stringify(baseLog)
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }

  debug(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatMessage("DEBUG", message, context))
    }
  }

  info(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatMessage("INFO", message, context))
    }
  }

  warn(message: string, context?: LogContext) {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage("WARN", message, context))
    }
  }

  error(message: string, error?: Error, context?: LogContext) {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : undefined,
      }
      console.error(this.formatMessage("ERROR", message, errorContext))
    }
  }

  // API-specific logging methods
  apiRequest(method: string, endpoint: string, context?: LogContext) {
    this.info(`API Request: ${method} ${endpoint}`, {
      ...context,
      method,
      endpoint,
      type: "api_request",
    })
  }
}

export const logger = new Logger()

// Middleware to extract request context
export function getRequestContext(request: Request): LogContext {
  const url = new URL(request.url)
  const requestHeaders = request.headers
  return {
    method: request.method,
    endpoint: url.pathname,
    ip: requestHeaders.get("x-forwarded-for") || requestHeaders.get("x-real-ip") || "unknown",
    userAgent: requestHeaders.get("user-agent") || "unknown",
    requestId: requestHeaders.get("x-request-id") ?? crypto.randomUUID(),
  }
}

// Health check utilities
export interface HealthStatus {
  status: "healthy" | "unhealthy"
  timestamp: string
}

export async function getHealthStatus(): Promise<HealthStatus> {
  let database = false
  try {
    await prisma.$queryRaw`SELECT 1`
    database = true
  } catch {
    database = false
  }

  return {
    status: database ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
  }
}
