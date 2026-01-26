// Intake Webhook - Formspree Submissions
// Endpoint: POST /api/intake/formspree

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Rate limiting store (in production, use Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Rate limit config
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per minute per IP

// Spam detection patterns
// Spam detection patterns
const SPAM_PATTERNS = [
  /\b(viagra|cialis|casino|poker|lottery|winner)\b/i,
  /\b(click here|act now|limited time|free money)\b/i,
  /<script|javascript:|data:/i,
  /\[url=|<a href=/i,
]

// Field length limits
const FIELD_LIMITS = {
  email: 254,
  name: 200,
  companyName: 200,
  website: 500,
  phone: 50,
  service: 100,
  message: 5000,
}

// Sanitize string input
function sanitizeString(value: unknown, maxLength: number): string {
  if (typeof value !== 'string') return ''
  // Trim whitespace, limit length, remove null bytes
  return value.trim().slice(0, maxLength).replace(/\0/g, '')
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'

    // Rate limiting check
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Verify Formspree webhook (check for required fields)
    // Formspree sends data in a specific format
    const formData = body._formspree_submission || body

    // Extract and sanitize common fields
    // Also accept short aliases for Zapier compatibility (truncated field names)
    const email = sanitizeString(
      formData.email || formData.Email || formData.em || formData.e || formData._replyto,
      FIELD_LIMITS.email
    ).toLowerCase()
    const name = sanitizeString(
      formData.name || formData.Name || formData.na || formData.n || formData['full-name'],
      FIELD_LIMITS.name
    )
    const companyName = sanitizeString(
      formData.company || formData.Company || formData.co || formData.c || formData['company-name'],
      FIELD_LIMITS.companyName
    )
    const website = sanitizeString(
      formData.website || formData.Website || formData.we || formData.w || formData.url,
      FIELD_LIMITS.website
    )
    const phone = sanitizeString(
      formData.phone || formData.Phone || formData.ph || formData.p || formData.tel,
      FIELD_LIMITS.phone
    )
    const service = sanitizeString(
      formData.service || formData.Service || formData.se || formData.s || formData['service-type'],
      FIELD_LIMITS.service
    )
    const message = sanitizeString(
      formData.message || formData.Message || formData.me || formData.m || formData.details,
      FIELD_LIMITS.message
    )

    // Validate required email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required.' },
        { status: 400 }
      )
    }

    // Check for spam
    const isSpam = checkForSpam(formData)

    // Validate service against ServiceTemplate if provided
    let validatedService: string | null = null
    if (service) {
      const serviceTemplate = await prisma.serviceTemplate.findUnique({
        where: { slug: service },
        select: { slug: true },
      })
      if (serviceTemplate) {
        validatedService = serviceTemplate.slug
      }
      // If no matching template, service stays null but raw value is in formData
    }

    // Create lead record
    const lead = await prisma.lead.create({
      data: {
        email,
        name: name || null,
        companyName: companyName || null,
        website: website || null,
        phone: phone || null,
        service: validatedService,
        message: message || null,
        source: 'formspree',
        status: 'NEW',
        isSpam,
        formData: formData, // Store raw form data (includes original service value)
      },
    })

    // Log the activity
    await prisma.activityLog.create({
      data: {
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        details: {
          source: 'formspree',
          email: lead.email,
          isSpam,
          ip,
        },
        ipAddress: ip,
      },
    })

    // Send notification (if configured)
    if (!isSpam && process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN) {
      await sendNotification({
        lead,
        ip,
      })
    }

    return NextResponse.json({
      success: true,
      id: lead.id,
      isSpam,
    })
  } catch (error) {
    console.error('Intake webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Rate limiting helper
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitStore.get(ip)

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false
  }

  record.count++
  return true
}

// Email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Spam detection
function checkForSpam(data: Record<string, unknown>): boolean {
  const textContent = Object.values(data)
    .filter((v): v is string => typeof v === 'string')
    .join(' ')

  return SPAM_PATTERNS.some((pattern) => pattern.test(textContent))
}

// Send notification via Pushover
async function sendNotification({
  lead,
  ip,
}: {
  lead: { id: string; email: string; name: string | null; service: string | null }
  ip: string
}) {
  try {
    // Get location from IP
    let location = ''
    if (ip && ip !== 'unknown' && ip !== '::1' && ip !== '127.0.0.1') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=city,regionCode,country`)
        if (geoRes.ok) {
          const geo = await geoRes.json()
          if (geo.city) {
            location = `${geo.city}${geo.regionCode ? `, ${geo.regionCode}` : ''}${geo.country ? `, ${geo.country}` : ''}`
          }
        }
      } catch {
        // Silent fail
      }
    }

    let message = `New lead: ${lead.name || lead.email}`
    if (lead.service) message += `\nService: ${lead.service}`
    if (location) message += `\n📌 ${location}`

    await fetch('https://api.pushover.net/1/messages.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.PUSHOVER_API_TOKEN,
        user: process.env.PUSHOVER_USER_KEY,
        message,
        title: 'New Lead Submitted',
        url: `https://dashboard.bertrandbrands.com/leads/${lead.id}`,
        url_title: 'View Lead',
        priority: 0,
      }),
    })
  } catch (error) {
    console.error('Failed to send notification:', error)
  }
}
