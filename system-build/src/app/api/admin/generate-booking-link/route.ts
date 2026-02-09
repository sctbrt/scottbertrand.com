// Admin-only endpoint to generate a booking access link for routed clients
// Use case: Admin generates link from CRM, sends to client for gated Calendly access

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import crypto from 'crypto'

// Token expires in 72 hours (admin may not send immediately)
const TOKEN_EXPIRY_HOURS = 72

// Max request body size (10KB)
const MAX_BODY_SIZE = 10 * 1024

// Map routing paths to booking types
const PATH_TO_BOOKING_TYPE: Record<string, string> = {
  FOCUS_STUDIO: 'focus_studio_kickoff',
  CORE_SERVICES: 'core_services_discovery',
}

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

    // Rate limiting
    const ip = getClientIP(request.headers)
    const rateLimit = await checkRateLimit(ip, 'ADMIN', 'generate-booking-link')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
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
    const { clientId } = body

    if (!clientId || typeof clientId !== 'string') {
      return NextResponse.json(
        { error: 'Client ID is required' },
        { status: 400 }
      )
    }

    // Fetch client with routing info
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        contactName: true,
        contactEmail: true,
        assignedPath: true,
        intakeStatus: true,
      },
    })

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    // Validate client has been routed
    if (!client.assignedPath || client.assignedPath === 'HOLD') {
      return NextResponse.json(
        { error: 'Client must be routed to Focus Studio or Core Services before generating a booking link' },
        { status: 400 }
      )
    }

    // Map assigned path to booking type
    const bookingType = PATH_TO_BOOKING_TYPE[client.assignedPath]
    if (!bookingType) {
      return NextResponse.json(
        { error: `Unknown routing path: ${client.assignedPath}` },
        { status: 400 }
      )
    }

    // Generate a secure token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expires = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    // Store the token hash in the database
    await prisma.booking_access_tokens.create({
      data: {
        clientId: client.id,
        bookingType,
        tokenHash,
        expiresAt: expires,
        createdBy: session.user.id,
      },
    })

    // Build the booking access URL
    const baseUrl = process.env.PUBLIC_SITE_URL || 'https://brands.bertrandgroup.ca'
    const bookingUrl = `${baseUrl}/booking/access?token=${rawToken}`

    // Log the activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'GENERATE_BOOKING_LINK',
        entityType: 'Client',
        entityId: client.id,
        details: {
          targetEmail: client.contactEmail,
          bookingType,
          assignedPath: client.assignedPath,
          expiresAt: expires.toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      url: bookingUrl,
      expiresAt: expires.toISOString(),
      expiresInHours: TOKEN_EXPIRY_HOURS,
      bookingType,
      client: {
        name: client.contactName,
        email: client.contactEmail,
        assignedPath: client.assignedPath,
      },
    })

  } catch (error) {
    console.error('Generate booking link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate booking link' },
      { status: 500 }
    )
  }
}
