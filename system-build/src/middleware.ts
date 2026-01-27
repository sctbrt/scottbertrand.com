// BERTRANDBRANDS.COM — Host-Based Routing Middleware
// Routes requests based on subdomain to appropriate sections
//
// This middleware handles routing for the system-build Next.js app:
// - dashboard.bertrandbrands.com → /dashboard/* (admin only)
// - clients.bertrandbrands.com → /portal/* (client portal)
//
// NOTE: notes.* and goods.* subdomains are deployed separately
// from the main Vite site and should NOT be handled by this app.

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

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

// API routes that should be publicly accessible (webhooks, etc.)
const PUBLIC_API_PATHS = ['/api/intake', '/api/webhooks', '/api/temp-login', '/api/debug-resend']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Remove port from hostname for matching
  const host = hostname.split(':')[0]

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
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|api/auth).*)',
  ],
}
