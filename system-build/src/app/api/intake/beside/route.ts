// Beside (AI phone) intake webhook — bridged via Zapier.
//
// Zap shape: Beside "Call Completed" → Zapier "POST Webhook" → this endpoint.
// Auth: shared secret in `X-Beside-Secret` header (matches BESIDE_WEBHOOK_SECRET env).
//
// Behavior:
//   - Always creates a `leads` row (`source: 'beside'`).
//   - Stuffs the call summary + optional transcript URL into the `internalNotes` and `formData` fields.
//   - Encrypts sensitive PII (email, phone, message) when ENCRYPTION_KEY is set.
//   - If the caller's email matches an existing client, also adds an
//     `intake_submissions` row with intakeType: ai_phone, entrySource: phone_ai_beside,
//     and pipes the summary into the besideSummary / besideTranscriptUrl columns.
//
// All Zapier integrations should target the same shape:
//   {
//     "name":           "Jane Doe",          // optional
//     "email":          "jane@example.com",  // required
//     "phone":          "+17055551234",      // optional
//     "summary":        "Call summary text…", // required, ≤4000 chars
//     "transcriptUrl":  "https://…",         // optional
//     "callId":         "beside_abc123",     // optional, used for idempotency
//     "calledAt":       "2026-04-17T15:30:00Z" // optional ISO timestamp
//   }

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { encrypt, isEncryptionConfigured } from '@/lib/encryption'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import crypto from 'crypto'

const MAX_BODY_SIZE = 16 * 1024
const MAX_SUMMARY_CHARS = 4000

interface BesidePayload {
  name?: string
  email: string
  phone?: string
  summary: string
  transcriptUrl?: string
  callId?: string
  calledAt?: string
}

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  if (aBuf.length !== bBuf.length) return false
  return crypto.timingSafeEqual(aBuf, bBuf)
}

function isValidEmail(s: unknown): s is string {
  return typeof s === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)
}

export async function POST(request: NextRequest) {
  try {
    // Body size guard
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    // Rate limit
    const ip = getClientIP(request.headers)
    const rl = await checkRateLimit(ip, 'INTAKE', 'beside-webhook')
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: rateLimitHeaders(rl) },
      )
    }

    // Shared-secret auth
    const expected = process.env.BESIDE_WEBHOOK_SECRET
    if (!expected) {
      console.error('[Beside] BESIDE_WEBHOOK_SECRET is not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 503 })
    }
    const provided = request.headers.get('x-beside-secret') ?? ''
    if (!constantTimeEqual(provided, expected)) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    // Parse + validate body
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const payload = body as Partial<BesidePayload>

    if (!isValidEmail(payload.email)) {
      return NextResponse.json({ error: 'email is required and must be valid' }, { status: 400 })
    }
    if (!payload.summary || typeof payload.summary !== 'string' || !payload.summary.trim()) {
      return NextResponse.json({ error: 'summary is required' }, { status: 400 })
    }

    const email = payload.email.trim().toLowerCase()
    const name = typeof payload.name === 'string' ? payload.name.trim().slice(0, 200) : null
    const phone = typeof payload.phone === 'string' ? payload.phone.trim().slice(0, 40) : null
    const summary = payload.summary.trim().slice(0, MAX_SUMMARY_CHARS)
    const transcriptUrl =
      typeof payload.transcriptUrl === 'string' && payload.transcriptUrl.startsWith('http')
        ? payload.transcriptUrl.trim().slice(0, 500)
        : null
    const callId = typeof payload.callId === 'string' ? payload.callId.trim().slice(0, 200) : null

    // Idempotency: if callId provided and we already have a lead with it, return that row
    if (callId) {
      const existing = await prisma.leads.findFirst({
        where: { source: 'beside', formData: { path: ['callId'], equals: callId } },
        select: { id: true, createdAt: true },
      })
      if (existing) {
        return NextResponse.json(
          { ok: true, deduped: true, leadId: existing.id, createdAt: existing.createdAt },
          { status: 200 },
        )
      }
    }

    // Encrypt sensitive PII when configured
    const enc = isEncryptionConfigured()
    const storedEmail = enc ? encrypt(email) : email
    const storedPhone = phone ? (enc ? encrypt(phone) : phone) : null
    const storedMessage = enc ? encrypt(summary) : summary

    const formData: Prisma.InputJsonValue = {
      callId,
      transcriptUrl,
      calledAt: payload.calledAt ?? null,
      ...(enc ? { _encrypted: true } : { email, phone, summary }),
    }

    const lead = await prisma.leads.create({
      data: {
        email: storedEmail,
        name,
        phone: storedPhone,
        message: storedMessage,
        source: 'beside',
        status: 'NEW',
        formData,
      },
      select: { id: true, createdAt: true },
    })

    // If this caller already exists as a client (matched on plaintext email),
    // also create a structured intake_submissions row tied to that client.
    // Note: when encryption is on, we can only match clients whose contactEmail
    // is stored unencrypted (which is the current schema convention).
    let intakeSubmissionId: string | null = null
    const existingClient = await prisma.clients.findFirst({
      where: { contactEmail: email },
      select: { id: true },
    })
    if (existingClient) {
      const submission = await prisma.intake_submissions.create({
        data: {
          clientId: existingClient.id,
          intakeType: 'AI_PHONE',
          entrySource: 'PHONE_AI_BESIDE',
          status: 'SUBMITTED',
          submittedAt: new Date(),
          besideSummary: summary,
          besideTranscriptUrl: transcriptUrl,
        },
        select: { id: true },
      })
      intakeSubmissionId = submission.id
    }

    await prisma.activity_logs.create({
      data: {
        action: 'BESIDE_WEBHOOK_RECEIVED',
        entityType: 'Lead',
        entityId: lead.id,
        details: {
          source: 'beside',
          hasTranscript: !!transcriptUrl,
          callId,
          matchedExistingClient: !!existingClient,
          intakeSubmissionId,
        },
      },
    })

    return NextResponse.json(
      {
        ok: true,
        leadId: lead.id,
        intakeSubmissionId,
        matchedClient: !!existingClient,
        createdAt: lead.createdAt,
      },
      { status: 201, headers: rateLimitHeaders(rl) },
    )
  } catch (error) {
    console.error('[Beside webhook] Failed:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
