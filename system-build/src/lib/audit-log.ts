// Security Audit Logging Utility
// Centralized logging for security-relevant events
//
// Events logged:
// - Authentication attempts (success/failure)
// - Rate limit violations
// - HTTPS redirects
// - Sensitive data access
// - Admin actions
//
// NOTE: Database logging requires the audit_logs table to exist.
// Run `npx prisma migrate dev` to create it.
// Until migration is run, only console logging is active.

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

// Audit event types
export type AuditEventType =
  | 'AUTH_LOGIN_SUCCESS'
  | 'AUTH_LOGIN_FAILURE'
  | 'AUTH_LOGOUT'
  | 'AUTH_MAGIC_LINK_SENT'
  | 'AUTH_MAGIC_LINK_USED'
  | 'AUTH_SESSION_EXPIRED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'HTTPS_REDIRECT'
  | 'LEAD_CREATED'
  | 'LEAD_VIEWED'
  | 'LEAD_UPDATED'
  | 'LEAD_DELETED'
  | 'CLIENT_CREATED'
  | 'CLIENT_VIEWED'
  | 'CLIENT_UPDATED'
  | 'FILE_UPLOADED'
  | 'FILE_DOWNLOADED'
  | 'FILE_DELETED'
  | 'ADMIN_ACTION'
  | 'SUSPICIOUS_ACTIVITY'

// Severity levels for filtering/alerting
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL'

// Audit log entry structure
export interface AuditLogEntry {
  eventType: AuditEventType
  severity: AuditSeverity
  userId?: string | null
  sessionId?: string | null
  ip: string
  userAgent?: string | null
  path?: string | null
  method?: string | null
  resourceType?: string | null
  resourceId?: string | null
  details?: Record<string, unknown>
  success: boolean
}

// Map event types to default severity
const EVENT_SEVERITY: Record<AuditEventType, AuditSeverity> = {
  AUTH_LOGIN_SUCCESS: 'INFO',
  AUTH_LOGIN_FAILURE: 'WARNING',
  AUTH_LOGOUT: 'INFO',
  AUTH_MAGIC_LINK_SENT: 'INFO',
  AUTH_MAGIC_LINK_USED: 'INFO',
  AUTH_SESSION_EXPIRED: 'INFO',
  RATE_LIMIT_EXCEEDED: 'WARNING',
  HTTPS_REDIRECT: 'INFO',
  LEAD_CREATED: 'INFO',
  LEAD_VIEWED: 'INFO',
  LEAD_UPDATED: 'INFO',
  LEAD_DELETED: 'WARNING',
  CLIENT_CREATED: 'INFO',
  CLIENT_VIEWED: 'INFO',
  CLIENT_UPDATED: 'INFO',
  FILE_UPLOADED: 'INFO',
  FILE_DOWNLOADED: 'INFO',
  FILE_DELETED: 'WARNING',
  ADMIN_ACTION: 'INFO',
  SUSPICIOUS_ACTIVITY: 'CRITICAL',
}

/**
 * Log a security-relevant event
 * Writes to both console (for Vercel logs) and database (for querying)
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString()
  const severity = entry.severity || EVENT_SEVERITY[entry.eventType] || 'INFO'

  // Console log for Vercel/development (structured for log aggregation)
  const logData = {
    timestamp,
    type: 'AUDIT',
    event: entry.eventType,
    severity,
    userId: entry.userId || null,
    ip: entry.ip,
    path: entry.path || null,
    method: entry.method || null,
    resourceType: entry.resourceType || null,
    resourceId: entry.resourceId || null,
    success: entry.success,
    details: entry.details || null,
  }

  // Use appropriate console method based on severity
  switch (severity) {
    case 'CRITICAL':
    case 'ERROR':
      console.error('[AUDIT]', JSON.stringify(logData))
      break
    case 'WARNING':
      console.warn('[AUDIT]', JSON.stringify(logData))
      break
    default:
      console.log('[AUDIT]', JSON.stringify(logData))
  }

  // Attempt database write (non-blocking, fail silently)
  // NOTE: This requires the audit_logs table - run prisma migrate if not exists
  try {
    // Use raw query to avoid type errors before migration
    // After migration, can use prisma.audit_logs.create()
    await prisma.$executeRaw`
      INSERT INTO audit_logs (id, "eventType", severity, "userId", "sessionId", ip, "userAgent", path, method, "resourceType", "resourceId", details, success, "createdAt")
      VALUES (
        ${`cuid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`},
        ${entry.eventType},
        ${severity},
        ${entry.userId || null},
        ${entry.sessionId || null},
        ${entry.ip},
        ${entry.userAgent || null},
        ${entry.path || null},
        ${entry.method || null},
        ${entry.resourceType || null},
        ${entry.resourceId || null},
        ${entry.details ? JSON.stringify(entry.details) : null},
        ${entry.success},
        NOW()
      )
    `
  } catch (error) {
    // Don't let audit logging failures break the application
    // Table may not exist yet if migration hasn't run
    if (process.env.NODE_ENV === 'development') {
      console.warn('[AUDIT] Database write skipped (table may not exist):', (error as Error).message)
    }
  }
}

/**
 * Convenience function for logging auth events
 */
export async function logAuthEvent(
  eventType: Extract<AuditEventType, `AUTH_${string}`>,
  {
    userId,
    email,
    ip,
    userAgent,
    success = true,
    reason,
  }: {
    userId?: string | null
    email?: string
    ip: string
    userAgent?: string | null
    success?: boolean
    reason?: string
  }
): Promise<void> {
  await logAuditEvent({
    eventType,
    severity: success ? 'INFO' : 'WARNING',
    userId,
    ip,
    userAgent,
    path: '/api/auth',
    method: 'POST',
    success,
    details: {
      // Don't log full email, just domain for privacy
      emailDomain: email ? email.split('@')[1] : undefined,
      reason,
    },
  })
}

/**
 * Convenience function for logging resource access
 */
export async function logResourceAccess(
  action: 'VIEWED' | 'CREATED' | 'UPDATED' | 'DELETED',
  resourceType: 'LEAD' | 'CLIENT' | 'FILE',
  {
    resourceId,
    userId,
    ip,
    path,
    details,
  }: {
    resourceId: string
    userId?: string | null
    ip: string
    path?: string
    details?: Record<string, unknown>
  }
): Promise<void> {
  const eventType = `${resourceType}_${action}` as AuditEventType

  await logAuditEvent({
    eventType,
    severity: action === 'DELETED' ? 'WARNING' : 'INFO',
    userId,
    ip,
    path,
    resourceType,
    resourceId,
    success: true,
    details,
  })
}

/**
 * Log rate limit exceeded events
 */
export async function logRateLimitExceeded({
  ip,
  path,
  limitType,
}: {
  ip: string
  path: string
  limitType: string
}): Promise<void> {
  await logAuditEvent({
    eventType: 'RATE_LIMIT_EXCEEDED',
    severity: 'WARNING',
    ip,
    path,
    success: false,
    details: { limitType },
  })
}

/**
 * Log suspicious activity for security review
 */
export async function logSuspiciousActivity({
  ip,
  path,
  reason,
  details,
}: {
  ip: string
  path?: string
  reason: string
  details?: Record<string, unknown>
}): Promise<void> {
  await logAuditEvent({
    eventType: 'SUSPICIOUS_ACTIVITY',
    severity: 'CRITICAL',
    ip,
    path,
    success: false,
    details: { reason, ...details },
  })
}

/**
 * Query audit logs (for admin dashboard)
 * NOTE: Requires audit_logs table - run prisma migrate first
 */
export async function getAuditLogs(options: {
  eventType?: AuditEventType
  severity?: AuditSeverity
  userId?: string
  ip?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}) {
  const conditions: string[] = []
  const params: unknown[] = []

  if (options.eventType) {
    conditions.push(`"eventType" = $${params.length + 1}`)
    params.push(options.eventType)
  }
  if (options.severity) {
    conditions.push(`severity = $${params.length + 1}`)
    params.push(options.severity)
  }
  if (options.userId) {
    conditions.push(`"userId" = $${params.length + 1}`)
    params.push(options.userId)
  }
  if (options.ip) {
    conditions.push(`ip = $${params.length + 1}`)
    params.push(options.ip)
  }
  if (options.startDate) {
    conditions.push(`"createdAt" >= $${params.length + 1}`)
    params.push(options.startDate)
  }
  if (options.endDate) {
    conditions.push(`"createdAt" <= $${params.length + 1}`)
    params.push(options.endDate)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const limit = options.limit || 100
  const offset = options.offset || 0

  try {
    const result = await prisma.$queryRawUnsafe<AuditLogRecord[]>(`
      SELECT * FROM audit_logs
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT ${limit} OFFSET ${offset}
    `, ...params)
    return result
  } catch {
    // Table may not exist yet
    console.warn('[AUDIT] getAuditLogs failed - table may not exist')
    return []
  }
}

// Type for raw audit log records
interface AuditLogRecord {
  id: string
  eventType: string
  severity: string
  userId: string | null
  sessionId: string | null
  ip: string
  userAgent: string | null
  path: string | null
  method: string | null
  resourceType: string | null
  resourceId: string | null
  details: string | null
  success: boolean
  createdAt: Date
}
