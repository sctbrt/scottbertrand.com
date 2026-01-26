// DEV ONLY: Bypass email verification for local testing
// This route should NEVER be deployed to production

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { cookies } from 'next/headers'

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const adminEmail = 'hello@bertrandbrands.com'

  try {
    // Find admin user
    const user = await prisma.users.findUnique({
      where: { email: adminEmail },
    })

    if (!user) {
      return NextResponse.json({ error: 'Admin user not found. Run seed first.' }, { status: 404 })
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

    // Redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', 'http://localhost:3000'))
  } catch (error) {
    console.error('Dev login error:', error)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }
}
