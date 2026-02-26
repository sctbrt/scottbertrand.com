// Intake Webhook - Google Ads Lead Form Submissions
// Endpoint: POST /api/intake/google-ads
//
// Security:
// - Shared key verification (google_key field in payload)
// - Rate limiting
// - Input sanitization
// - Spam detection

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import { encrypt, isEncryptionConfigured } from '@/lib/encryption'

// Max request body size (100KB)
const MAX_BODY_SIZE = 100 * 1024

// Shared key for webhook verification — set in Google Ads lead form config
const GOOGLE_ADS_WEBHOOK_KEY = process.env.GOOGLE_ADS_WEBHOOK_KEY

// Spam detection patterns (shared with formspree endpoint)
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
  return value.trim().slice(0, maxLength).replace(/\0/g, '')
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

// Extract a field value from Google Ads user_column_data array
function extractField(
  columns: Array<{ column_id: string; string_value?: string }>,
  columnId: string
): string {
  const col = columns.find((c) => c.column_id === columnId)
  return col?.string_value || ''
}

// GET handler — info about the endpoint
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/intake/google-ads',
    accepts: 'POST',
    description: 'Google Ads lead form webhook intake endpoint',
  })
}

export async function POST(request: NextRequest) {
  try {
    // Check content-length
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: 'Request body too large' },
        { status: 413 }
      )
    }

    // Parse request body
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      )
    }

    // Verify shared key
    const providedKey = typeof body.google_key === 'string' ? body.google_key : ''
    if (!GOOGLE_ADS_WEBHOOK_KEY) {
      if (process.env.NODE_ENV === 'production') {
        console.error('[Google Ads Webhook] GOOGLE_ADS_WEBHOOK_KEY not configured — rejecting in production')
        return NextResponse.json(
          { error: 'Webhook not configured' },
          { status: 503 }
        )
      }
      console.warn('[Google Ads Webhook] No GOOGLE_ADS_WEBHOOK_KEY configured — verification skipped (dev only)')
    } else if (providedKey !== GOOGLE_ADS_WEBHOOK_KEY) {
      // Log suspicious activity
      console.warn('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        event: 'SUSPICIOUS_ACTIVITY',
        severity: 'CRITICAL',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        path: '/api/intake/google-ads',
        success: false,
        details: {
          reason: 'invalid_google_key',
          hasKey: !!providedKey,
        },
      }))
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    // Get client IP for rate limiting
    const headersList = await headers()
    const ip = getClientIP(headersList)

    // Get geo info from Vercel headers
    const geo = {
      city: headersList.get('x-vercel-ip-city') || '',
      region: headersList.get('x-vercel-ip-country-region') || '',
      country: headersList.get('x-vercel-ip-country') || '',
    }

    // Rate limiting
    const rateLimit = await checkRateLimit(ip, 'INTAKE', 'google-ads')
    if (!rateLimit.allowed) {
      console.warn('[AUDIT]', JSON.stringify({
        timestamp: new Date().toISOString(),
        type: 'AUDIT',
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING',
        ip,
        path: '/api/intake/google-ads',
        success: false,
        details: { limitType: 'INTAKE' },
      }))
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) }
      )
    }

    // Extract Google Ads metadata
    const leadId = sanitizeString(body.lead_id, 100)
    const formId = sanitizeString(body.form_id, 100)
    const campaignId = sanitizeString(body.campaign_id, 100)
    const adgroupId = sanitizeString(body.adgroup_id, 100)
    const creativeId = sanitizeString(body.creative_id, 100)
    const gclId = sanitizeString(body.gcl_id, 200)
    const apiVersion = sanitizeString(body.api_version, 20)
    const isTest = body.is_test === true

    // Extract user fields from user_column_data array
    const columns = Array.isArray(body.user_column_data) ? body.user_column_data : []

    const email = sanitizeString(
      extractField(columns, 'EMAIL') || extractField(columns, 'email'),
      FIELD_LIMITS.email
    ).toLowerCase()

    const name = sanitizeString(
      extractField(columns, 'FULL_NAME') || extractField(columns, 'full_name'),
      FIELD_LIMITS.name
    )

    const phone = sanitizeString(
      extractField(columns, 'PHONE_NUMBER') || extractField(columns, 'phone_number'),
      FIELD_LIMITS.phone
    )

    const companyName = sanitizeString(
      extractField(columns, 'COMPANY_NAME') || extractField(columns, 'company_name'),
      FIELD_LIMITS.companyName
    )

    // Custom fields (Website URL and qualifying question)
    const website = sanitizeString(
      extractField(columns, 'WEBSITE_URL') ||
      extractField(columns, 'website_url') ||
      extractField(columns, 'WEBSITE'),
      FIELD_LIMITS.website
    )

    const needCategory = sanitizeString(
      extractField(columns, 'WHAT_DO_YOU_NEED_MOST') ||
      extractField(columns, 'what_do_you_need_most') ||
      extractField(columns, 'QUALIFYING_QUESTION'),
      200
    )

    // Handle test submissions — log but don't create real leads
    if (isTest) {
      console.log('[Google Ads Webhook] Test submission received', JSON.stringify({
        timestamp: new Date().toISOString(),
        leadId,
        formId,
        campaignId,
        isTest: true,
      }))

      // Create a test lead to verify integration works end-to-end
      const testLead = await prisma.leads.create({
        data: {
          email: email || 'google-ads-test@bertrandgroup.ca',
          name: name || 'Google Ads Test',
          source: 'google-ads',
          status: 'NEW',
          isSpam: false,
          formData: {
            test: true,
            leadId,
            formId,
            campaignId,
            receivedAt: new Date().toISOString(),
          },
        },
      })

      return NextResponse.json({
        success: true,
        id: testLead.id,
        test: true,
        message: 'Test webhook received successfully',
      })
    }

    // Validate required email
    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Valid email address is required.' },
        { status: 400 }
      )
    }

    // Build a flat record for spam checking
    const flatData: Record<string, unknown> = {
      email, name, phone, companyName, website, needCategory,
    }

    // Check for spam
    const isSpam = checkForSpam(flatData)

    // Encrypt sensitive fields if configured
    const shouldEncrypt = isEncryptionConfigured()
    const storedEmail = shouldEncrypt ? encrypt(email) : email
    const storedPhone = phone ? (shouldEncrypt ? encrypt(phone) : phone) : null

    // Build formData JSON with campaign metadata (no raw sensitive data if encrypted)
    const formDataFields: Record<string, string | boolean | null | Record<string, string>> = {
      source: 'google-ads',
      leadId,
      formId,
      campaignId,
      adgroupId,
      creativeId,
      gclId,
      apiVersion,
      needCategory: needCategory || null,
      geo,
      receivedAt: new Date().toISOString(),
    }

    if (shouldEncrypt) {
      formDataFields._encrypted = true
    } else {
      // Include non-sensitive context in formData when not encrypting
      formDataFields.website = website || null
    }

    // Cast to Prisma JSON type
    const formDataJson = formDataFields as unknown as Prisma.InputJsonValue

    // Create lead record
    const lead = await prisma.leads.create({
      data: {
        email: storedEmail,
        name: name || null,
        companyName: companyName || null,
        website: website || null,
        phone: storedPhone,
        service: null,
        message: null,
        source: 'google-ads',
        status: 'NEW',
        isSpam,
        formData: formDataJson,
      },
    })

    // Log the activity
    await prisma.activity_logs.create({
      data: {
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        details: {
          source: 'google-ads',
          emailDomain: email.split('@')[1] || 'unknown',
          campaignId,
          adgroupId,
          gclId: gclId ? '(present)' : null,
          isSpam,
          encrypted: shouldEncrypt,
          ip,
        },
        ipAddress: ip,
      },
    })

    // Security audit log
    console.log('[AUDIT]', JSON.stringify({
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      event: 'LEAD_CREATED',
      severity: isSpam ? 'WARNING' : 'INFO',
      ip,
      path: '/api/intake/google-ads',
      resourceType: 'LEAD',
      resourceId: lead.id,
      success: true,
      details: {
        source: 'google-ads',
        emailDomain: email.split('@')[1] || 'unknown',
        campaignId,
        isSpam,
        encrypted: shouldEncrypt,
      },
    }))

    // Create intake submission for CRM routing (Google Ads leads = WEB scope)
    if (!isSpam) {
      try {
        // Find or create user + client for this email
        let user = await prisma.users.findUnique({ where: { email } })
        if (!user) {
          user = await prisma.users.create({
            data: {
              email,
              name: name || null,
              role: 'CLIENT',
            },
          })
        }

        let client = await prisma.clients.findUnique({ where: { userId: user.id } })
        if (!client) {
          client = await prisma.clients.create({
            data: {
              userId: user.id,
              contactName: name || email,
              contactEmail: email,
              phone: phone || null,
              website: website || null,
              companyName: companyName || null,
              newOrReturning: 'NEW',
              intakeStatus: 'SUBMITTED',
              locationCity: geo.city || null,
              locationCountry: geo.country || null,
            },
          })
        } else {
          await prisma.clients.update({
            where: { id: client.id },
            data: { intakeStatus: 'SUBMITTED' },
          })
        }

        // Map Google Ads qualifying question to scope/needs
        const intakeData: Record<string, unknown> = {
          clientId: client.id,
          intakeType: 'SELF_GUIDED',
          entrySource: 'OTHER', // Google Ads, not direct web form
          status: 'SUBMITTED',
          submittedAt: new Date(),
          scopeType: 'WEB', // Google Ads campaign targets web services
        }

        // Map qualifying question to narrative field
        if (needCategory) {
          intakeData.whatsNotWorking = `[Google Ads] Need: ${needCategory}`
        }

        await prisma.intake_submissions.create({
          data: intakeData as Prisma.intake_submissionsUncheckedCreateInput,
        })

        console.log('[INTAKE]', JSON.stringify({
          timestamp: new Date().toISOString(),
          event: 'INTAKE_CREATED',
          source: 'google-ads',
          clientId: client.id,
          leadId: lead.id,
          campaignId,
        }))
      } catch (intakeError) {
        // Don't fail lead creation if intake submission fails
        console.error('[INTAKE] Failed to create intake_submission:', intakeError)
      }
    }

    // Send Pushover notification (if configured and not spam)
    if (!isSpam && process.env.PUSHOVER_USER_KEY && process.env.PUSHOVER_API_TOKEN) {
      try {
        let location = ''
        if (geo.city || geo.region || geo.country) {
          const parts = [geo.city, geo.region, geo.country].filter(Boolean)
          location = parts.join(', ')
        }

        let message = `${name || email}`
        if (email && name) message += `\n${email}`
        if (companyName) message += `\nBusiness: ${companyName}`
        if (website) message += `\nWebsite: ${website}`
        if (phone) message += `\nPhone: ${phone}`
        if (needCategory) message += `\nNeed: ${needCategory}`
        if (campaignId) message += `\nCampaign: ${campaignId}`
        if (location) message += `\n📌 ${location}`

        await fetch('https://api.pushover.net/1/messages.json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: process.env.PUSHOVER_API_TOKEN,
            user: process.env.PUSHOVER_USER_KEY,
            message,
            title: 'Google Ads Lead',
            url: `https://dash.bertrandgroup.ca/leads/${lead.id}`,
            url_title: 'View Lead',
            priority: 1,
            sound: 'cashregister',
          }),
        })
      } catch (notifyError) {
        console.error('Failed to send notification:', notifyError)
      }
    }

    return NextResponse.json({
      success: true,
      id: lead.id,
      isSpam,
    })
  } catch (error) {
    console.error('Google Ads intake webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
