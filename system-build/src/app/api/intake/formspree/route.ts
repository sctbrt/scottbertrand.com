// Intake Webhook - Formspree Submissions
// Endpoint: POST /api/intake/formspree

import { NextRequest, NextResponse } from 'next/server'

// Max request body size (100KB)
const MAX_BODY_SIZE = 100 * 1024
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'

// Rate limit config
const RATE_LIMIT_WINDOW = 60 // 60 seconds
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per minute per IP

// Upstash Redis REST API helpers
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

async function redisCommand(command: string[]): Promise<unknown> {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.warn('[Rate Limit] Upstash Redis not configured, skipping rate limit')
    return null
  }

  const response = await fetch(`${UPSTASH_REDIS_REST_URL}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })

  if (!response.ok) {
    console.error('[Rate Limit] Redis error:', await response.text())
    return null
  }

  const data = await response.json()
  return data.result
}

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
    // Check content-length to prevent oversized requests
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    // Get client IP for rate limiting
    const headersList = await headers()
    const ip = headersList.get('x-forwarded-for')?.split(',')[0] ||
               headersList.get('x-real-ip') ||
               'unknown'

    // Get geo info from Vercel headers (free, no external API needed)
    const geo = {
      city: headersList.get('x-vercel-ip-city') || '',
      region: headersList.get('x-vercel-ip-country-region') || '',
      country: headersList.get('x-vercel-ip-country') || '',
    }

    // Rate limiting check (using Upstash Redis)
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    // Parse request body
    const body = await request.json()

    // Debug logging to understand Formspree payload
    console.log('[Intake] Received webhook payload:', JSON.stringify(body, null, 2))

    // Formspree webhook format:
    // { form: "formId", submission: { email, name, _date, _subject, ... } }
    // The actual form fields are in body.submission
    let formData = body

    // Handle Formspree's actual webhook format (submission wrapper)
    if (body.submission && typeof body.submission === 'object') {
      formData = body.submission
      console.log('[Intake] Extracted submission data:', JSON.stringify(formData, null, 2))
    } else if (body._formspree_submission) {
      formData = body._formspree_submission
    } else if (body.data && typeof body.data === 'object') {
      formData = body.data
    }

    // Handle Formspree test webhooks - they may not have real form data
    // Accept test submissions with a test email for validation
    const isTestWebhook = body.test === true || body._test === true
    if (isTestWebhook) {
      console.log('[Intake] Received Formspree test webhook')
      // For test webhooks, create a test lead to verify integration
      const testLead = await prisma.leads.create({
        data: {
          email: 'formspree-test@bertrandbrands.com',
          name: 'Formspree Test',
          source: 'formspree',
          status: 'NEW',
          isSpam: false,
          formData: { test: true, receivedAt: new Date().toISOString() },
        },
      })
      return NextResponse.json({
        success: true,
        id: testLead.id,
        test: true,
        message: 'Test webhook received successfully',
      })
    }

    // Extract and sanitize common fields
    // Handle various field naming conventions from Formspree
    const email = sanitizeString(
      formData.email || formData.Email || formData.EMAIL ||
      formData.em || formData.e ||
      formData._replyto || formData['_replyto'] ||
      formData.contact_email || formData['contact-email'] ||
      formData.user_email || formData['user-email'],
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
      const serviceTemplate = await prisma.service_templates.findUnique({
        where: { slug: service },
        select: { slug: true },
      })
      if (serviceTemplate) {
        validatedService = serviceTemplate.slug
      }
      // If no matching template, service stays null but raw value is in formData
    }

    // Create lead record
    const lead = await prisma.leads.create({
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
    await prisma.activity_logs.create({
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
        geo,
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

// Rate limiting helper using Upstash Redis
async function checkRateLimit(ip: string): Promise<boolean> {
  // If Redis not configured, allow request (fail open)
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    return true
  }

  const key = `rate_limit:formspree:${ip}`

  try {
    // INCR the key and get current count
    const count = await redisCommand(['INCR', key]) as number

    // If this is the first request, set expiry
    if (count === 1) {
      await redisCommand(['EXPIRE', key, String(RATE_LIMIT_WINDOW)])
    }

    // Check if over limit
    return count <= RATE_LIMIT_MAX_REQUESTS
  } catch (error) {
    console.error('[Rate Limit] Error checking rate limit:', error)
    // Fail open - allow request if Redis fails
    return true
  }
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
  geo,
}: {
  lead: { id: string; email: string; name: string | null; service: string | null }
  geo: { city: string; region: string; country: string }
}) {
  try {
    // Build location string from Vercel geo headers
    let location = ''
    if (geo.city || geo.region || geo.country) {
      const parts = [geo.city, geo.region, geo.country].filter(Boolean)
      location = parts.join(', ')
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
