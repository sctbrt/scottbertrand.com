// TEMPORARY: Public endpoint to directly create admin session
// DELETE THIS FILE AFTER USE

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { cookies } from 'next/headers'

// Admin emails that can use this endpoint
const ADMIN_EMAILS = [
  'hello@bertrandbrands.com',
  'bertrandbrands@outlook.com',
  'sctbrt01@gmail.com',
]

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email')
  const action = request.nextUrl.searchParams.get('action')

  if (!email || !ADMIN_EMAILS.includes(email.toLowerCase())) {
    return NextResponse.json(
      { error: 'Invalid email. Must be one of the admin emails.' },
      { status: 400 }
    )
  }

  const normalizedEmail = email.toLowerCase()

  // Verify user exists
  const user = await prisma.users.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, email: true, role: true, name: true },
  })

  if (!user || user.role !== 'INTERNAL_ADMIN') {
    return NextResponse.json(
      { error: 'User not found or not admin' },
      { status: 404 }
    )
  }

  // If action=login, create session directly and redirect
  if (action === 'login') {
    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('base64url')
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create session in database
    await prisma.sessions.create({
      data: {
        sessionToken: sessionToken,
        userId: user.id,
        expires: expires,
      },
    })

    // Build redirect URL
    const host = request.headers.get('host') || 'dashboard.bertrandbrands.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    const redirectUrl = new URL('/dashboard', baseUrl)

    // Create response with redirect
    const response = NextResponse.redirect(redirectUrl)

    // Set the session cookie (Auth.js uses authjs.session-token)
    // In production with HTTPS, it uses __Secure- prefix
    const isSecure = protocol === 'https'
    const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token'

    response.cookies.set(cookieName, sessionToken, {
      httpOnly: true,
      secure: isSecure,
      sameSite: 'lax',
      path: '/',
      expires: expires,
    })

    return response
  }

  // Default: show login link
  const host = request.headers.get('host') || 'dashboard.bertrandbrands.com'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  const loginUrl = new URL('/api/temp-login', baseUrl)
  loginUrl.searchParams.set('email', normalizedEmail)
  loginUrl.searchParams.set('action', 'login')

  return NextResponse.json({
    message: 'Click the link below to log in directly (bypasses email verification).',
    warning: 'DELETE THIS ENDPOINT AFTER USE - Security risk!',
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    loginUrl: loginUrl.toString(),
  })
}
