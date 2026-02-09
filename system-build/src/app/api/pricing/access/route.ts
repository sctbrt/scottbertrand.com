// GET /api/pricing/access?token=xxx
// Validates magic link token and creates pricing session
// POST /api/pricing/access - same behavior for CORS preflight compatibility

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

const SESSION_DURATION_HOURS = parseInt(process.env.PRICING_SESSION_HOURS || '4', 10)
const IS_PRODUCTION = process.env.NODE_ENV === 'production' || !!process.env.VERCEL

function buildSessionCookie(sessionId: string, expiresAt: Date) {
  const parts = [
    `bb_pricing_session=${sessionId}`,
    `Path=/`,
    `Max-Age=${Math.floor((expiresAt.getTime() - Date.now()) / 1000)}`,
    `HttpOnly`,
    `SameSite=Lax`,
  ]

  if (IS_PRODUCTION) {
    parts.push('Secure')
    // Set on parent domain so cookie works across subdomains
    parts.push('Domain=.bertrandgroup.ca')
  }

  return parts.join('; ')
}

async function handleAccess(token: string | null) {
  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 })
  }

  // Hash the token to match database
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

  try {
    // Find and consume magic link atomically
    const magicLink = await prisma.pricing_magic_links.updateMany({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    })

    if (magicLink.count === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 400 })
    }

    // Get the email from the consumed link
    const link = await prisma.pricing_magic_links.findFirst({
      where: { tokenHash },
      select: { email: true },
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 400 })
    }

    // Create pricing session
    const sessionExpiresAt = new Date(Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000)
    const session = await prisma.pricing_sessions.create({
      data: {
        email: link.email,
        expiresAt: sessionExpiresAt,
      },
    })

    // Build response with session cookie
    const response = NextResponse.json({
      ok: true,
      expiresAt: sessionExpiresAt.toISOString(),
    })

    response.headers.set('Set-Cookie', buildSessionCookie(session.id, sessionExpiresAt))

    return response

  } catch (error) {
    console.error('[Pricing] Access error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')
  return handleAccess(token)
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    return handleAccess(body?.token)
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
