// Centralized Rate Limiting Utility
// Uses Upstash Redis with in-memory fallback (fail-closed)

// Rate limit config presets
export const RATE_LIMITS = {
  // Webhook intake - moderate limit
  INTAKE: { window: 60, max: 10, fallbackMax: 5 },
  // Auth endpoints - stricter to prevent brute force
  AUTH: { window: 60, max: 5, fallbackMax: 3 },
  // Admin endpoints - moderate (already behind auth)
  ADMIN: { window: 60, max: 20, fallbackMax: 10 },
  // General API - standard limit
  API: { window: 60, max: 30, fallbackMax: 15 },
} as const

type RateLimitPreset = keyof typeof RATE_LIMITS

// In-memory rate limit storage (fallback when Redis unavailable)
// Note: In serverless, this only works within the same instance
const inMemoryRateLimits = new Map<string, { count: number; resetAt: number }>()

// Upstash Redis REST API credentials
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

/**
 * Execute a Redis command via Upstash REST API
 */
async function redisCommand(command: string[]): Promise<unknown> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return null
  }

  const response = await fetch(UPSTASH_REDIS_REST_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    console.error('[Rate Limit] Redis error:', await response.text())
    return null
  }

  const data = await response.json()
  return data.result
}

/**
 * In-memory fallback rate limiting
 * Used when Redis is unavailable - stricter limits since it's per-instance only
 */
function checkInMemoryRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): { allowed: boolean; remaining: number; resetAt: Date } {
  const now = Date.now()
  const entry = inMemoryRateLimits.get(key)

  // Clean up expired entries periodically (1% of calls)
  if (Math.random() < 0.01) {
    for (const [k, v] of inMemoryRateLimits.entries()) {
      if (now > v.resetAt) {
        inMemoryRateLimits.delete(k)
      }
    }
  }

  if (!entry || now > entry.resetAt) {
    // New window
    const resetAt = now + windowSeconds * 1000
    inMemoryRateLimits.set(key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: new Date(resetAt),
    }
  }

  entry.count++
  const allowed = entry.count <= maxRequests
  return {
    allowed,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: new Date(entry.resetAt),
  }
}

/**
 * Check rate limit for a given identifier
 * @param identifier - Unique identifier (usually IP address or user ID)
 * @param preset - Rate limit preset name (INTAKE, AUTH, ADMIN, API)
 * @param namespace - Optional namespace prefix for the key
 * @returns Object with allowed status, remaining requests, and reset time
 */
export async function checkRateLimit(
  identifier: string,
  preset: RateLimitPreset = 'API',
  namespace?: string
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const config = RATE_LIMITS[preset]
  const key = namespace
    ? `rate_limit:${namespace}:${identifier}`
    : `rate_limit:${preset.toLowerCase()}:${identifier}`

  // If Redis not configured, use in-memory fallback with stricter limits
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.warn(`[Rate Limit] Redis not configured, using in-memory fallback for ${preset}`)
    return checkInMemoryRateLimit(key, config.window, config.fallbackMax)
  }

  try {
    // INCR the key and get current count
    const count = (await redisCommand(['INCR', key])) as number

    // If this is the first request, set expiry
    if (count === 1) {
      await redisCommand(['EXPIRE', key, String(config.window)])
    }

    // Get TTL to calculate reset time
    const ttl = (await redisCommand(['TTL', key])) as number
    const resetAt = new Date(Date.now() + (ttl > 0 ? ttl * 1000 : config.window * 1000))

    return {
      allowed: count <= config.max,
      remaining: Math.max(0, config.max - count),
      resetAt,
    }
  } catch (error) {
    console.error('[Rate Limit] Redis error, using in-memory fallback:', error)
    // Fail to fallback with stricter limits
    return checkInMemoryRateLimit(key, config.window, config.fallbackMax)
  }
}

/**
 * Create rate limit headers for the response
 */
export function rateLimitHeaders(result: {
  remaining: number
  resetAt: Date
}): Record<string, string> {
  return {
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt.getTime() / 1000)),
  }
}

/**
 * Helper to get client IP from request headers
 */
export function getClientIP(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  )
}
