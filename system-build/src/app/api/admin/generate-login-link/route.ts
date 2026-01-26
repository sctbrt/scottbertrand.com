// Admin-only endpoint to generate a magic login link for clients
// Use case: Client can't receive magic link email (spam filter, etc.)

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

// Link expires in 15 minutes (same as normal magic links)
const LINK_EXPIRY_MINUTES = 15

// Max request body size (10KB - only needs email)
const MAX_BODY_SIZE = 10 * 1024

export async function POST(request: NextRequest) {
  try {
    // Check content-length to prevent oversized requests
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    // Verify admin authentication
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    if (session.user.role !== 'INTERNAL_ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { email } = body

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { error: 'Email address is required' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Verify user exists
    const user = await prisma.users.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!user) {
      return NextResponse.json(
        { error: 'No user found with this email address' },
        { status: 404 }
      )
    }

    // Generate a secure token
    const token = crypto.randomBytes(32).toString('hex')
    const expires = new Date(Date.now() + LINK_EXPIRY_MINUTES * 60 * 1000)

    // Store the verification token (NextAuth uses this table)
    await prisma.verification_tokens.create({
      data: {
        identifier: normalizedEmail,
        token: token,
        expires: expires,
      },
    })

    // Build the callback URL
    // This mimics the NextAuth magic link format
    const baseUrl = process.env.AUTH_URL || 'https://bertrandbrands.com'
    const callbackUrl = user.role === 'CLIENT'
      ? '/portal'
      : '/dashboard'

    const loginUrl = new URL('/api/auth/callback/resend', baseUrl)
    loginUrl.searchParams.set('token', token)
    loginUrl.searchParams.set('email', normalizedEmail)
    loginUrl.searchParams.set('callbackUrl', callbackUrl)

    // Log the activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'GENERATE_LOGIN_LINK',
        entityType: 'User',
        entityId: user.id,
        details: {
          targetEmail: normalizedEmail,
          targetRole: user.role,
          expiresAt: expires.toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      url: loginUrl.toString(),
      expiresAt: expires.toISOString(),
      expiresInMinutes: LINK_EXPIRY_MINUTES,
      user: {
        email: user.email,
        name: user.name,
        role: user.role,
      },
    })

  } catch (error) {
    console.error('Generate login link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate login link' },
      { status: 500 }
    )
  }
}
