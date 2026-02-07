// DEV ONLY: Bypass email verification for local testing
// This route is blocked in production at multiple levels

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

// Fail-fast: block immediately in production or on Vercel (before any imports execute)
const IS_BLOCKED = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
const DEV_LOGIN_ENABLED = !IS_BLOCKED && process.env.DEV_LOGIN_ENABLED === 'true'

export async function GET(request: NextRequest) {
  // Hard block: return 404 (not 403) in production to avoid revealing endpoint exists
  if (IS_BLOCKED || !DEV_LOGIN_ENABLED) {
    return new NextResponse(null, { status: 404 })
  }

  // Get email from query param, default to admin
  const { searchParams } = new URL(request.url)
  const email = searchParams.get('email') || 'hello@bertrandbrands.com'
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'

  try {
    // Find user by email
    const user = await prisma.users.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: `User not found: ${email}. Run seed first.` }, { status: 404 })
    }

    // Create a session directly
    const session = await prisma.sessions.create({
      data: {
        userId: user.id,
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        sessionToken: crypto.randomUUID(),
      },
    })

    // Set the session cookie
    const cookieStore = await cookies()
    cookieStore.set('authjs.session-token', session.sessionToken, {
      httpOnly: true,
      secure: false, // Dev only
      sameSite: 'lax',
      path: '/',
      expires: session.expires,
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: user.id,
        action: 'SIGN_IN',
        entityType: 'User',
        entityId: user.id,
        details: {
          method: 'dev-bypass',
          timestamp: new Date().toISOString(),
        },
      },
    })

    // Redirect to callback URL
    return NextResponse.redirect(new URL(callbackUrl, 'http://localhost:3000'))
  } catch (error) {
    console.error('Dev login error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
