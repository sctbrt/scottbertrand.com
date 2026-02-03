// BERTRANDBRANDS.COM — Host-Based Routing Proxy
// Routes requests based on subdomain to appropriate sections
//
// This proxy handles routing for the system-build Next.js app:
// - dashboard.bertrandbrands.com → /dashboard/* (admin only)
// - clients.bertrandbrands.com → /portal/* (client portal)
//
// NOTE: notes.* and goods.* subdomains are deployed separately
// from the main Vite site and should NOT be handled by this app.
//
// Security features:
// - HTTPS enforcement (production)
// - Rate limiting for auth endpoints
// - Security event logging

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Simple in-memory rate limiter for auth endpoints (proxy can't use async Redis)
// This is per-instance but provides basic brute-force protection
const authRateLimits = new Map<string, { count: number; resetAt: number }>()
const AUTH_RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const AUTH_RATE_LIMIT_MAX = 10 // 10 auth attempts per minute per IP

function checkAuthRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = authRateLimits.get(ip)

  // Clean up expired entries (1% of calls)
  if (Math.random() < 0.01) {
    for (const [key, value] of authRateLimits.entries()) {
      if (now > value.resetAt) authRateLimits.delete(key)
    }
  }

  if (!entry || now > entry.resetAt) {
    authRateLimits.set(ip, { count: 1, resetAt: now + AUTH_RATE_LIMIT_WINDOW })
    return true
  }

  entry.count++
  return entry.count <= AUTH_RATE_LIMIT_MAX
}

// Domain configuration - only domains handled by this Next.js app
const DOMAINS: Record<string, string[]> = {
  // Production domains (both scottbertrand.com and bertrandbrands.com)
  PUBLIC: ['bertrandbrands.com', 'www.bertrandbrands.com'],
  DASHBOARD: ['dashboard.bertrandbrands.com', 'dashboard.scottbertrand.com'],
  PORTAL: ['clients.bertrandbrands.com', 'clients.scottbertrand.com'],

  // Test/Staging domains (test.bertrandbrands.com)
  TEST_PUBLIC: ['test.bertrandbrands.com'],
  TEST_DASHBOARD: ['dashboard.test.bertrandbrands.com'],
  TEST_PORTAL: ['clients.test.bertrandbrands.com'],

  // Development patterns
  DEV_PUBLIC: ['localhost', '127.0.0.1'],
  DEV_DASHBOARD: ['dashboard.localhost'],
  DEV_PORTAL: ['clients.localhost'],
}

// Protected paths that require authentication
// Note: Currently all dashboard/portal paths require auth by default
// This can be expanded for more granular control if needed

// Public paths that don't require auth (login pages, etc.)
const AUTH_PATHS = ['/login', '/auth', '/api/auth']

// API routes that should be publicly accessible (webhooks, intake forms)
// NOTE: Only add routes here that genuinely need to be unauthenticated (e.g., external webhooks)
const PUBLIC_API_PATHS = ['/api/intake', '/api/webhooks']

// Delivery Room paths - these have their own auth check in the layout
// and should not be rewritten by subdomain routing
const DELIVERY_ROOM_PATHS = ['/p/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const protocol = request.headers.get('x-forwarded-proto') || 'http'

  // Remove port from hostname for matching
  const host = hostname.split(':')[0]

  // Get client IP for security logging and rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'

  // ============================================
  // HTTPS Enforcement (Production Only)
  // ============================================
  const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
  const isLocalhost = host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost')

  if (isProduction && !isLocalhost && protocol !== 'https') {
    // Redirect HTTP to HTTPS
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    // Log HTTPS redirect (structured for audit aggregation)
    console.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event: 'HTTPS_REDIRECT',
      severity: 'INFO',
      ip,
      path: pathname,
      host,
      success: true,
    }))
    return NextResponse.redirect(httpsUrl, 301)
  }

  // Rate limit auth endpoints to prevent brute force attacks
  if (pathname.startsWith('/api/auth') && request.method === 'POST') {
    if (!checkAuthRateLimit(ip)) {
      // Log rate limit exceeded (structured for audit aggregation)
      console.warn('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING',
        ip,
        path: pathname,
        host: hostname,
        success: false,
        details: { limitType: 'AUTH', window: '60s', max: AUTH_RATE_LIMIT_MAX },
      }))
      return new NextResponse(
        JSON.stringify({ error: 'Too many authentication attempts. Please try again later.' }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      )
    }
  }

  // Determine which site we're on
  const siteType = getSiteType(host)

  // Skip middleware for static files and API routes (except protected ones)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') // Static files
  ) {
    return NextResponse.next()
  }

  // Create response with site context header
  const response = NextResponse.next()
  response.headers.set('x-site-type', siteType)

  // Delivery Room routes (/p/[publicId]) - handled directly without rewriting
  // These have their own auth check in the page layout
  if (DELIVERY_ROOM_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Handle dashboard routing
  if (siteType === 'dashboard') {
    return handleDashboardRouting(request, pathname)
  }

  // Handle portal routing
  if (siteType === 'portal') {
    return handlePortalRouting(request, pathname)
  }

  // Public site - no auth required
  return response
}

function getSiteType(host: string): 'public' | 'dashboard' | 'portal' {
  // Dashboard (production, test, or dev)
  if (
    DOMAINS.DASHBOARD.includes(host) ||
    DOMAINS.TEST_DASHBOARD.includes(host) ||
    DOMAINS.DEV_DASHBOARD.includes(host) ||
    host.startsWith('dashboard.')
  ) {
    return 'dashboard'
  }

  // Portal (production, test, or dev)
  if (
    DOMAINS.PORTAL.includes(host) ||
    DOMAINS.TEST_PORTAL.includes(host) ||
    DOMAINS.DEV_PORTAL.includes(host) ||
    host.startsWith('clients.')
  ) {
    return 'portal'
  }

  // Default to public
  // NOTE: notes.* and goods.* subdomains are handled by separate Vercel deployments
  return 'public'
}

async function handleDashboardRouting(request: NextRequest, pathname: string) {
  // Allow auth routes without authentication (don't rewrite - use root-level auth pages)
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Allow public API routes (webhooks, intake, etc.) without authentication
  if (PUBLIC_API_PATHS.some(path => pathname.startsWith(path))) {
    // Don't rewrite - let them hit the API routes directly
    return NextResponse.next()
  }

  // If path already starts with /dashboard, don't double-rewrite
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Check for session token (Auth.js cookie)
  const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                       request.cookies.get('__Secure-authjs.session-token')?.value

  if (!sessionToken) {
    // Log auth denied (structured for audit aggregation)
    const reqIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  'unknown'
    const reqHost = request.headers.get('host') || 'unknown'
    console.warn('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event: 'AUTH_LOGIN_FAILURE',
      severity: 'WARNING',
      ip: reqIp,
      path: pathname,
      host: reqHost,
      success: false,
      details: { reason: 'no_session', area: 'dashboard' },
    }))

    // Redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Rewrite to dashboard route group
  const url = request.nextUrl.clone()
  url.pathname = `/dashboard${pathname}`
  return NextResponse.rewrite(url)
}

async function handlePortalRouting(request: NextRequest, pathname: string) {
  // Allow auth routes without authentication (don't rewrite - use root-level auth pages)
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // If path already starts with /portal, don't double-rewrite
  if (pathname.startsWith('/portal')) {
    return NextResponse.next()
  }

  // Check for session token (Auth.js cookie)
  const sessionToken = request.cookies.get('authjs.session-token')?.value ||
                       request.cookies.get('__Secure-authjs.session-token')?.value

  if (!sessionToken) {
    // Log auth denied (structured for audit aggregation)
    const reqIp = request.headers.get('x-forwarded-for')?.split(',')[0] ||
                  request.headers.get('x-real-ip') ||
                  'unknown'
    const reqHost = request.headers.get('host') || 'unknown'
    console.warn('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event: 'AUTH_LOGIN_FAILURE',
      severity: 'WARNING',
      ip: reqIp,
      path: pathname,
      host: reqHost,
      success: false,
      details: { reason: 'no_session', area: 'portal' },
    }))

    // Redirect to login
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Rewrite to portal route group
  const url = request.nextUrl.clone()
  url.pathname = `/portal${pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     *
     * Note: api/auth IS included for rate limiting (removed from exclusion)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}
