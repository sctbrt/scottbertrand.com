// POST /api/pricing/logout
// Ends pricing session and clears cookie

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

export async function POST() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('bb_pricing_session')?.value

  if (sessionId) {
    try {
      // Delete session from database
      await prisma.pricing_sessions.delete({
        where: { id: sessionId },
      }).catch(() => {
        // Session may not exist, that's fine
      })
    } catch {
      // Ignore errors - we're logging out anyway
    }
  }

  // Clear cookie
  const response = NextResponse.json({ ok: true })
  response.headers.set('Set-Cookie', buildClearCookie())
  return response
}
