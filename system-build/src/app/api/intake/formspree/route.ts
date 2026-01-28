// Intake Webhook - Formspree Submissions
// Endpoint: POST /api/intake/formspree
//
// Security:
// - Resthook protocol handshake (X-Hook-Secret)
// - Origin validation (Formspree IPs/domains)
// - Rate limiting
// - Input sanitization

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import { encrypt, isEncryptionConfigured } from '@/lib/encryption'

// Max request body size (100KB)
const MAX_BODY_SIZE = 100 * 1024

// Formspree webhook secret for Resthook handshake verification
// Set this in your environment after configuring the webhook in Formspree
const FORMSPREE_WEBHOOK_SECRET = process.env.FORMSPREE_WEBHOOK_SECRET

// Trusted webhook origins (Formspree sends from these)
const TRUSTED_ORIGINS = [
  'formspree.io',
  'www.formspree.io',
  'api.formspree.io',
]

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

// Validate webhook origin
function isValidWebhookOrigin(request: NextRequest): boolean {
  // Check User-Agent for Formspree
  const userAgent = request.headers.get('user-agent') || ''
  if (userAgent.toLowerCase().includes('formspree')) {
    return true
  }

  // Check Origin/Referer headers
  const origin = request.headers.get('origin') || request.headers.get('referer') || ''
  for (const trusted of TRUSTED_ORIGINS) {
    if (origin.includes(trusted)) {
      return true
    }
  }

  // If no webhook secret is configured, be more permissive (log warning)
  if (!FORMSPREE_WEBHOOK_SECRET) {
    console.warn('[Webhook] No FORMSPREE_WEBHOOK_SECRET configured - origin validation relaxed')
    return true
  }

  return false
}

// Resthook handshake - Formspree sends this to verify webhook URL
// Responds with the same X-Hook-Secret to confirm ownership
export async function GET(request: NextRequest) {
  const hookSecret = request.headers.get('x-hook-secret')

  if (hookSecret) {
    // Resthook handshake - echo back the secret
    console.log('[Webhook] Resthook handshake received')
    return new NextResponse(null, {
      status: 200,
      headers: {
        'X-Hook-Secret': hookSecret,
      },
    })
  }

  // Regular GET request - return info about the endpoint
  return NextResponse.json({
    endpoint: '/api/intake/formspree',
    accepts: 'POST',
    description: 'Formspree webhook intake endpoint',
  })
}

export async function POST(request: NextRequest) {
  try {
    // Validate webhook origin (Formspree verification)
    if (!isValidWebhookOrigin(request)) {
      // Log suspicious activity (potential webhook spoofing)
      console.warn('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        event: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        path: '/api/intake/formspree',
        success: false,
        details: {
          reason: 'invalid_webhook_origin',
          userAgent: request.headers.get('user-agent'),
          origin: request.headers.get('origin'),
          referer: request.headers.get('referer'),
        },
      }))
      return NextResponse.json(
        { error: 'Unauthorized webhook source' },
        { status: 403 }
      )
    }

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
    const ip = getClientIP(headersList)

    // Get geo info from Vercel headers (free, no external API needed)
    const geo = {
      city: headersList.get('x-vercel-ip-city') || '',
      region: headersList.get('x-vercel-ip-country-region') || '',
      country: headersList.get('x-vercel-ip-country') || '',
    }

    // Rate limiting check (using shared utility)
    const rateLimit = await checkRateLimit(ip, 'INTAKE', 'formspree')
    if (!rateLimit.allowed) {
      // Log rate limit exceeded
      console.warn('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING',
        ip,
        path: '/api/intake/formspree',
        success: false,
        details: { limitType: 'INTAKE' },
      }))
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Parse request body
    const body = await request.json()

    // Formspree webhook format:
    // { form: "formId", submission: { email, name, _date, _subject, ... } }
    // The actual form fields are in body.submission
    let formData = body

    // Handle Formspree's actual webhook format (submission wrapper)
    if (body.submission && typeof body.submission === 'object') {
      formData = body.submission
    } else if (body._formspree_submission) {
      formData = body._formspree_submission
    } else if (body.data && typeof body.data === 'object') {
      formData = body.data
    }

    // Handle Formspree test webhooks - they may not have real form data
    // Accept test submissions with a test email for validation
    const isTestWebhook = body.test === true || body._test === true
    if (isTestWebhook) {
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

    // Encrypt sensitive fields if encryption is configured
    const shouldEncrypt = isEncryptionConfigured()
    const storedEmail = shouldEncrypt ? encrypt(email) : email
    const storedPhone = phone ? (shouldEncrypt ? encrypt(phone) : phone) : null
    const storedMessage = message ? (shouldEncrypt ? encrypt(message) : message) : null

    // Sanitize formData to remove sensitive fields before storing
    // (we store encrypted versions in dedicated columns)
    const sanitizedFormData = { ...formData }
    if (shouldEncrypt) {
      // Remove raw sensitive data from formData JSON
      delete sanitizedFormData.email
      delete sanitizedFormData.Email
      delete sanitizedFormData.phone
      delete sanitizedFormData.Phone
      delete sanitizedFormData.message
      delete sanitizedFormData.Message
      sanitizedFormData._encrypted = true
    }

    // Create lead record with encrypted sensitive data
    const lead = await prisma.leads.create({
      data: {
        email: storedEmail,
        name: name || null,
        companyName: companyName || null,
        website: website || null,
        phone: storedPhone,
        service: validatedService,
        message: storedMessage,
        source: 'formspree',
        status: 'NEW',
        isSpam,
        formData: sanitizedFormData,
      },
    })

    // Log the activity (don't log raw sensitive data)
    await prisma.activity_logs.create({
      data: {
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        details: {
          source: 'formspree',
          emailDomain: email.split('@')[1] || 'unknown', // Only log domain, not full email
          isSpam,
          encrypted: shouldEncrypt,
          ip,
        },
        ipAddress: ip,
      },
    })

    // Security audit log for lead creation
    console.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event: 'LEAD_CREATED',
      severity: isSpam ? 'WARNING' : 'INFO',
      ip,
      path: '/api/intake/formspree',
      resourceType: 'LEAD',
      resourceId: lead.id,
      success: true,
      details: {
        source: 'formspree',
        emailDomain: email.split('@')[1] || 'unknown',
        isSpam,
        encrypted: shouldEncrypt,
      },
    }))

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
