import { getRequestContext, logger } from "@/lib/monitoring"
import { NextRequest } from "next/server"

/**
 * Security event types for logging and monitoring
 */
export enum SecurityEventType {
  AUTH_FAILURE = "auth_failure",
  AUTH_SUCCESS = "auth_success",
  AUTHZ_FAILURE = "authz_failure",
  RATE_LIMIT_EXCEEDED = "rate_limit_exceeded",
  ADMIN_ACTION = "admin_action",
  USER_BLOCKED = "user_blocked",
  USER_DELETED = "user_deleted",
  LAB_INVITE_CREATED = "lab_invite_created",
  LAB_INVITE_ACCEPTED = "lab_invite_accepted",
  LAB_INVITE_REVOKED = "lab_invite_revoked",
  LAB_ROLE_CHANGED = "lab_role_changed",
  LAB_MEMBER_REMOVED = "lab_member_removed",
  LAB_DELETED = "lab_deleted",
  VISIBILITY_DOWNGRADE = "visibility_downgrade",
}

/**
 * Security event severity levels
 */
enum SecurityEventSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

/**
 * Security event data structure
 */
interface SecurityEvent {
  type: SecurityEventType
  userId?: string
  ip?: string
  userAgent?: string
  resource: string
  action: string
  success: boolean
  metadata?: Record<string, any>
  timestamp: Date
}

/**
 * Determines the severity of a security event
 */
const SEVERITY_BY_TYPE: Record<SecurityEventType, SecurityEventSeverity> = {
  [SecurityEventType.AUTH_FAILURE]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.AUTH_SUCCESS]: SecurityEventSeverity.LOW,
  [SecurityEventType.AUTHZ_FAILURE]: SecurityEventSeverity.HIGH,
  [SecurityEventType.RATE_LIMIT_EXCEEDED]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.ADMIN_ACTION]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.USER_BLOCKED]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.USER_DELETED]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.LAB_INVITE_CREATED]: SecurityEventSeverity.LOW,
  [SecurityEventType.LAB_INVITE_ACCEPTED]: SecurityEventSeverity.LOW,
  [SecurityEventType.LAB_INVITE_REVOKED]: SecurityEventSeverity.MEDIUM,
  [SecurityEventType.LAB_ROLE_CHANGED]: SecurityEventSeverity.HIGH,
  [SecurityEventType.LAB_MEMBER_REMOVED]: SecurityEventSeverity.HIGH,
  [SecurityEventType.LAB_DELETED]: SecurityEventSeverity.HIGH,
  [SecurityEventType.VISIBILITY_DOWNGRADE]: SecurityEventSeverity.HIGH,
}

/**
 * Logs a security event with proper context and severity
 */
async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  const severity = SEVERITY_BY_TYPE[event.type] ?? SecurityEventSeverity.LOW
  const logData = { ...event, severity }
  const message = `SECURITY [${event.type}]`

  switch (severity) {
    case SecurityEventSeverity.CRITICAL:
    case SecurityEventSeverity.HIGH:
      logger.error(message, undefined, logData)
      break
    case SecurityEventSeverity.MEDIUM:
      logger.warn(message, logData)
      break
    case SecurityEventSeverity.LOW:
      logger.info(message, logData)
      break
  }
}

/**
 * Helper function to create and log a security event from a request
 */
export async function logSecurityEventFromRequest(
  request: NextRequest,
  type: SecurityEventType,
  options: {
    userId?: string
    action: string
    success: boolean
    metadata?: Record<string, any>
  },
): Promise<void> {
  const context = getRequestContext(request)

  await logSecurityEvent({
    type,
    userId: options.userId,
    ip: context.ip,
    userAgent: context.userAgent,
    resource: request.nextUrl.pathname,
    action: options.action,
    success: options.success,
    metadata: options.metadata,
    timestamp: new Date(),
  })
}
