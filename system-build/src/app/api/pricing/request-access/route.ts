// POST /api/pricing/request-access
// Sends magic link email for pricing access via Resend
// Centralized in system-build to share database with CRM

import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'

// Config
const MAGIC_LINK_TTL_MINUTES = parseInt(process.env.PRICING_MAGIC_LINK_TTL_MINUTES || '15', 10)
const APP_URL = process.env.PRICING_APP_URL || 'https://brands.bertrandgroup.ca'
const RATE_LIMIT_EMAIL_PER_HOUR = 3

// Email validation regex (RFC 5321 compliant)
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

function generateToken() {
  const rawToken = crypto.randomBytes(32).toString('hex')
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
  return { rawToken, tokenHash }
}

function buildEmailHtml({ firstName, magicLink, expiresMinutes }: { firstName: string | null, magicLink: string, expiresMinutes: number }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Pricing Access Link</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 520px; margin: 0 auto; padding: 40px 20px; background-color: #fafafa;">
  <div style="background: #ffffff; padding: 32px; border-radius: 8px; border: 1px solid #e5e5e5;">
    <p style="margin: 0 0 16px 0; font-size: 15px;">
      ${greeting}
    </p>
    <p style="margin: 0 0 24px 0; font-size: 15px;">
      Here's your link to view pricing for our advanced services. Pricing varies by scope, so this gives you a starting point before we discuss your specific needs.
    </p>
    <a href="${magicLink}"
       style="display: inline-block; background: #0a0a0a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 15px;">
      View Pricing
    </a>
    <p style="margin: 24px 0 0 0; font-size: 13px; color: #666666;">
      This link expires in ${expiresMinutes} minutes and can only be used once.
    </p>
  </div>
  <p style="margin: 24px 0 0 0; font-size: 12px; color: #999999; text-align: center;">
    Bertrand Brands · Sudbury, Ontario
  </p>
</body>
</html>
  `.trim()
}

function buildEmailText({ firstName, magicLink, expiresMinutes }: { firstName: string | null, magicLink: string, expiresMinutes: number }) {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,'

  return `
${greeting}

Here's your link to view pricing for our advanced services. Pricing varies by scope, so this gives you a starting point before we discuss your specific needs.

View Pricing: ${magicLink}

This link expires in ${expiresMinutes} minutes and can only be used once.

--
Bertrand Brands · Sudbury, Ontario
  `.trim()
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, firstName } = body || {}

    // Validate email (always return success to prevent enumeration)
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: true })
    }

    const normalizedEmail = email.trim().toLowerCase()

    if (normalizedEmail.length > 254 || !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json({ ok: true })
    }

    // Rate limiting check (by email)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const recentCount = await prisma.pricing_magic_links.count({
      where: {
        email: normalizedEmail,
        createdAt: { gte: oneHourAgo },
      },
    })

    if (recentCount >= RATE_LIMIT_EMAIL_PER_HOUR) {
      console.log(`[Pricing] Rate limit exceeded for email: ${normalizedEmail.substring(0, 3)}***`)
      return NextResponse.json({ ok: true })
    }

    // Generate token
    const { rawToken, tokenHash } = generateToken()
    const expiresAt = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000)

    // Store in database
    await prisma.pricing_magic_links.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    })

    // Build magic link URL
    const magicLink = `${APP_URL}/pricing/access?token=${rawToken}`

    // Send email via Resend
    const resend = new Resend(process.env.RESEND_API_KEY)

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Bertrand Brands <hello@bertrandbrands.com>',
      to: normalizedEmail,
      subject: 'Your pricing access link',
      html: buildEmailHtml({
        firstName: firstName?.trim() || null,
        magicLink,
        expiresMinutes: MAGIC_LINK_TTL_MINUTES,
      }),
      text: buildEmailText({
        firstName: firstName?.trim() || null,
        magicLink,
        expiresMinutes: MAGIC_LINK_TTL_MINUTES,
      }),
    })

    console.log(`[Pricing] Magic link sent: ${normalizedEmail.substring(0, 3)}***`)

    // Add jitter delay to prevent timing-based email enumeration (100-300ms)
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    return NextResponse.json({ ok: true })

  } catch (error) {
    console.error('[Pricing] Request access error:', error)
    // Add same jitter delay on error path to prevent enumeration
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200))
    return NextResponse.json({ ok: true })
  }
}
