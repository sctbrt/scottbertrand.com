// Token-gated intake API.
// GET  → returns intake context + current saved responses (for resume).
// POST → autosaves responses (no submit). Updates currentSection.
// PUT  → final submit. Validates required questions, sets status=SUBMITTED,
//        consumes the token, and (best-effort) marks the project's
//        "Intake Form" milestone COMPLETED if it exists.

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import { validateIntakeToken } from '@/lib/intake/token'
import { normalizeResponses, validateForSubmit } from '@/lib/intake/validation'
import { SECTIONS, TOTAL_SECTIONS } from '@/lib/intake/question-set'

const MAX_BODY_SIZE = 64 * 1024 // 64 KB — generous for full submissions

async function readJson(request: NextRequest): Promise<unknown> {
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
  if (contentLength > MAX_BODY_SIZE) throw new Error('body-too-large')
  return request.json()
}

interface RouteContext {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  const ip = getClientIP(request.headers)
  const rl = await checkRateLimit(ip, 'API', 'intake-load')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) })
  }

  const result = await validateIntakeToken(token)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 410 })
  }

  const intake = await prisma.project_intakes.findUnique({
    where: { projectId: result.ctx.projectId },
    select: { responses: true, currentSection: true, status: true, startedAt: true },
  })

  // Mark token as opened (for admin visibility), but DO NOT set startedAt here —
  // that fires on first autosave so the welcome screen survives first render.
  if (intake) {
    await prisma.intake_access_tokens.update({
      where: { id: result.ctx.tokenId },
      data: { firstUsedAt: new Date() },
    }).catch(() => null)
  }

  return NextResponse.json({
    project: { name: result.ctx.projectName },
    client: { firstName: result.ctx.clientFirstName },
    intake: {
      responses: (intake?.responses as Record<string, unknown>) ?? {},
      currentSection: intake?.currentSection ?? 1,
      status: intake?.status ?? 'DRAFT',
      hasStarted: intake?.startedAt != null,
    },
    sections: SECTIONS,
    totalSections: TOTAL_SECTIONS,
  })
}

export async function POST(request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  const ip = getClientIP(request.headers)
  const rl = await checkRateLimit(ip, 'API', 'intake-autosave')
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) })
  }

  const result = await validateIntakeToken(token)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 410 })
  }

  let body: unknown
  try {
    body = await readJson(request)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const { responses, currentSection } = body as {
    responses?: unknown
    currentSection?: unknown
  }

  const normalized = normalizeResponses(responses)
  const section =
    typeof currentSection === 'number' && currentSection >= 1 && currentSection <= TOTAL_SECTIONS
      ? Math.floor(currentSection)
      : undefined

  const existing = await prisma.project_intakes.findUnique({
    where: { projectId: result.ctx.projectId },
    select: { startedAt: true },
  })
  await prisma.project_intakes.update({
    where: { projectId: result.ctx.projectId },
    data: {
      responses: normalized,
      ...(section ? { currentSection: section } : {}),
      status: 'IN_PROGRESS',
      ...(existing?.startedAt ? {} : { startedAt: new Date() }),
    },
  })

  return NextResponse.json({ ok: true, savedAt: new Date().toISOString() })
}

export async function PUT(request: NextRequest, ctx: RouteContext) {
  const { token } = await ctx.params
  const ip = getClientIP(request.headers)
  const rl = await checkRateLimit(ip, 'AUTH', 'intake-submit') // tighter — final action
  if (!rl.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) })
  }

  const result = await validateIntakeToken(token)
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 410 })
  }

  let body: unknown
  try {
    body = await readJson(request)
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const { responses } = (body ?? {}) as { responses?: unknown }
  const normalized = normalizeResponses(responses)
  const issues = validateForSubmit(normalized)
  if (issues.length > 0) {
    return NextResponse.json({ error: 'incomplete', issues }, { status: 422 })
  }

  const now = new Date()
  const intake = await prisma.project_intakes.findUnique({
    where: { projectId: result.ctx.projectId },
    select: { startedAt: true },
  })
  const startedAt = intake?.startedAt ?? now
  const timeToComplete = Math.max(0, Math.round((now.getTime() - startedAt.getTime()) / 1000))

  await prisma.$transaction([
    prisma.project_intakes.update({
      where: { projectId: result.ctx.projectId },
      data: {
        responses: normalized,
        status: 'SUBMITTED',
        submittedAt: now,
        timeToComplete,
        currentSection: TOTAL_SECTIONS,
      },
    }),
    prisma.intake_access_tokens.update({
      where: { id: result.ctx.tokenId },
      data: { consumedAt: now },
    }),
  ])

  // Best-effort: complete any milestone literally named "Intake Form" / "Intake"
  await prisma.milestones.updateMany({
    where: {
      projectId: result.ctx.projectId,
      name: { in: ['Intake Form', 'Intake', 'Intake Questionnaire'] },
      status: { not: 'COMPLETED' },
    },
    data: { status: 'COMPLETED', completedAt: now },
  })

  await prisma.activity_logs.create({
    data: {
      action: 'PROJECT_INTAKE_SUBMITTED',
      entityType: 'Project',
      entityId: result.ctx.projectId,
      details: { timeToComplete, questionCount: Object.keys(normalized).length },
    },
  })

  return NextResponse.json({ ok: true, submittedAt: now.toISOString() })
}
