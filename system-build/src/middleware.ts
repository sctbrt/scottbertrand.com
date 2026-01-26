// BERTRANDBRANDS.COM — Host-Based Routing Middleware
// Routes requests based on subdomain to appropriate sections

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Domain configuration
const DOMAINS: Record<string, string[]> = {
  // Production domains
  PUBLIC: ['bertrandbrands.com', 'www.bertrandbrands.com'],
  NOTES: ['notes.bertrandbrands.com'],
  GOODS: ['goods.bertrandbrands.com'],
  DASHBOARD: ['dashboard.bertrandbrands.com'],
  PORTAL: ['clients.bertrandbrands.com'],

  // Test/Staging domains (test.bertrandbrands.com)
  TEST_PUBLIC: ['test.bertrandbrands.com'],
  TEST_NOTES: ['notes.test.bertrandbrands.com'],
  TEST_GOODS: ['goods.test.bertrandbrands.com'],
  TEST_DASHBOARD: ['dashboard.test.bertrandbrands.com'],
  TEST_PORTAL: ['clients.test.bertrandbrands.com'],

  // Development patterns
  DEV_PUBLIC: ['localhost', '127.0.0.1'],
  DEV_DASHBOARD: ['dashboard.localhost'],
  DEV_PORTAL: ['clients.localhost'],
}

// Protected paths that require authentication
const PROTECTED_PATHS = {
  dashboard: ['/'],
  portal: ['/'],
}

// Public paths that don't require auth (login pages, etc.)
const AUTH_PATHS = ['/login', '/auth', '/api/auth']

// API routes that should be publicly accessible (webhooks, etc.)
const PUBLIC_API_PATHS = ['/api/intake', '/api/webhooks']

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

  // Handle notes subdomain
  if (siteType === 'notes') {
    return handleNotesRouting(request, pathname)
  }

  // Handle goods subdomain
  if (siteType === 'goods') {
    return handleGoodsRouting(request, pathname)
  }

  // Public site - no auth required
  return response
}

function getSiteType(host: string): 'public' | 'dashboard' | 'portal' | 'notes' | 'goods' {
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

  // Notes (production or test)
  if (
    DOMAINS.NOTES.includes(host) ||
    DOMAINS.TEST_NOTES.includes(host) ||
    host.startsWith('notes.')
  ) {
    return 'notes'
  }

  // Goods (production or test)
  if (
    DOMAINS.GOODS.includes(host) ||
    DOMAINS.TEST_GOODS.includes(host) ||
    host.startsWith('goods.')
  ) {
    return 'goods'
  }

  // Default to public (includes test.bertrandbrands.com)
  return 'public'
}

async function handleDashboardRouting(request: NextRequest, pathname: string) {
  // Allow auth routes without authentication
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = `/dashboard${pathname}`
    return NextResponse.rewrite(url)
  }

  // Allow public API routes (webhooks, intake, etc.) without authentication
  if (PUBLIC_API_PATHS.some(path => pathname.startsWith(path))) {
    // Don't rewrite - let them hit the API routes directly
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
  // Allow auth routes without authentication
  if (AUTH_PATHS.some(path => pathname.startsWith(path))) {
    const url = request.nextUrl.clone()
    url.pathname = `/portal${pathname}`
    return NextResponse.rewrite(url)
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

async function handleNotesRouting(request: NextRequest, pathname: string) {
  // Rewrite to notes route group (public, no auth)
  const url = request.nextUrl.clone()
  url.pathname = `/notes${pathname}`
  return NextResponse.rewrite(url)
}

async function handleGoodsRouting(request: NextRequest, pathname: string) {
  // Rewrite to goods route group (public, no auth)
  const url = request.nextUrl.clone()
  url.pathname = `/goods${pathname}`
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
