// GET /api/pricing/check-access
// Validates pricing session from cookie
// Returns access status for frontend to show/hide pricing

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'

const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

function buildClearCookie() {
  const parts = [
    `bb_pricing_session=`,
    `Path=/`,
    `Max-Age=0`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]

  if (IS_PRODUCTION) {
    parts.push('Secure')
    parts.push('Domain=.bertrandgroup.ca')
  }

  return parts.join('; ')
}

export async function GET() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('bb_pricing_session')?.value

  if (!sessionId) {
    return NextResponse.json({
      hasAccess: false,
      expiresAt: null,
    })
  }

  try {
    // Validate session
    const session = await prisma.pricing_sessions.findFirst({
      where: {
        id: sessionId,
        expiresAt: { gt: new Date() },
      },
    })

    if (!session) {
      // Session expired or invalid - clear cookie
      const response = NextResponse.json({
        hasAccess: false,
        expiresAt: null,
      })
      response.headers.set('Set-Cookie', buildClearCookie())
      return response
    }

    // Calculate remaining time
    const remainingMinutes = Math.max(0, Math.floor((session.expiresAt.getTime() - Date.now()) / 60000))

    return NextResponse.json({
      hasAccess: true,
      expiresAt: session.expiresAt.toISOString(),
      remainingMinutes,
    })

  } catch (error) {
    console.error('[Pricing] Check access error:', error)
    return NextResponse.json({
      hasAccess: false,
      expiresAt: null,
    })
  }
}
