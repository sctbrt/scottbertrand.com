// CSRF Protection via Origin/Referer validation
// Validates that state-changing requests originate from trusted domains

const TRUSTED_ORIGINS = [
  // Primary — bertrandgroup.ca
  'https://dash.bertrandgroup.ca',
  'https://clients.bertrandgroup.ca',
  'https://brands.bertrandgroup.ca',
  'https://bertrandgroup.ca',
  // Legacy (kept during transition)
  'https://dashboard.bertrandbrands.com',
  'https://clients.bertrandbrands.com',
  'https://bertrandbrands.com',
]

// Allow localhost in development
if (process.env.NODE_ENV !== 'production') {
  TRUSTED_ORIGINS.push('http://localhost:3000', 'http://localhost:3001')
}

/**
 * Validate that a request originates from a trusted domain.
 * Returns null if valid, or a descriptive error string if invalid.
 */
export function validateOrigin(request: Request): string | null {
  const origin = request.headers.get('origin')
  const referer = request.headers.get('referer')

  // At least one header must be present for POST/PUT/DELETE
  if (!origin && !referer) {
    return 'Missing Origin and Referer headers'
  }

  // Check Origin header first (most reliable)
  if (origin) {
    if (TRUSTED_ORIGINS.includes(origin)) {
      return null
    }
    return `Untrusted origin: ${origin}`
  }

  // Fall back to Referer
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin
      if (TRUSTED_ORIGINS.includes(refererOrigin)) {
        return null
      }
      return `Untrusted referer origin: ${refererOrigin}`
    } catch {
      return 'Malformed Referer header'
    }
  }

  return 'CSRF validation failed'
}
