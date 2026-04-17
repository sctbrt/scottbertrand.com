// Admin-only endpoint to generate a self-guided project intake link.
// One token per project. Reuses any non-expired, non-consumed token to avoid duplicates.

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { checkRateLimit, rateLimitHeaders, getClientIP } from '@/lib/rate-limit'
import crypto from 'crypto'

const TOKEN_EXPIRY_DAYS = 14
const MAX_BODY_SIZE = 10 * 1024

function intakeBaseUrl(): string {
  // Client-facing URL. Defaults to the branded intake subdomain, which is
  // wired in vercel.json to redirect to clients.bertrandbrands.ca/intake/:token.
  // This keeps the URL clients see short and purposeful.
  return process.env.INTAKE_BASE_URL || 'https://intake.bertrandbrands.ca'
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = parseInt(request.headers.get('content-length') || '0', 10)
    if (contentLength > MAX_BODY_SIZE) {
      return NextResponse.json({ error: 'Request body too large' }, { status: 413 })
    }

    const ip = getClientIP(request.headers)
    const rateLimit = await checkRateLimit(ip, 'ADMIN', 'generate-intake-link')
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(rateLimit) },
      )
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user.role !== 'INTERNAL_ADMIN') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await request.json()
    const { projectId, force } = body as { projectId?: string; force?: boolean }
    if (!projectId || typeof projectId !== 'string') {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 })
    }

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        clientId: true,
        clients: { select: { id: true, contactName: true, contactEmail: true } },
        projectIntake: { select: { id: true, status: true, submittedAt: true } },
      },
    })
    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (project.projectIntake?.status === 'SUBMITTED' && !force) {
      return NextResponse.json(
        {
          error: 'Intake already submitted for this project',
          intakeStatus: 'SUBMITTED',
          submittedAt: project.projectIntake.submittedAt,
        },
        { status: 409 },
      )
    }

    // Reuse an active token if one exists (avoid token sprawl when admin clicks twice)
    const now = new Date()
    const existing = await prisma.intake_access_tokens.findFirst({
      where: {
        projectId: project.id,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing && !force) {
      return NextResponse.json({
        success: true,
        reused: true,
        // Cannot return the raw token — only the hash is stored. Force=true to mint a new one.
        url: null,
        message:
          'An active intake link already exists. Pass {"force": true} to invalidate it and generate a new one.',
        expiresAt: existing.expiresAt.toISOString(),
        project: { id: project.id, name: project.name },
        client: { name: project.clients?.contactName, email: project.clients?.contactEmail },
      })
    }

    if (existing && force) {
      // Invalidate existing tokens for this project
      await prisma.intake_access_tokens.updateMany({
        where: { projectId: project.id, consumedAt: null },
        data: { consumedAt: now },
      })
    }

    // Mint a new token
    const rawToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex')
    const expires = new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000)

    await prisma.intake_access_tokens.create({
      data: {
        projectId: project.id,
        tokenHash,
        expiresAt: expires,
        createdBy: session.user.id,
      },
    })

    // Ensure a project_intakes row exists (DRAFT) so the form has somewhere to autosave
    await prisma.project_intakes.upsert({
      where: { projectId: project.id },
      create: {
        projectId: project.id,
        clientId: project.clientId,
        status: 'DRAFT',
      },
      update: {}, // do not reset existing draft state
    })

    // On the branded intake.* subdomain the token lives at the root (short URL);
    // on other hosts we keep the /intake/ prefix matching the page route.
    const base = intakeBaseUrl()
    const url = /\/\/intake\./.test(base) ? `${base}/${rawToken}` : `${base}/intake/${rawToken}`

    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'GENERATE_INTAKE_LINK',
        entityType: 'Project',
        entityId: project.id,
        details: {
          projectName: project.name,
          clientId: project.clientId,
          targetEmail: project.clients?.contactEmail ?? null,
          expiresAt: expires.toISOString(),
        },
      },
    })

    return NextResponse.json({
      success: true,
      reused: false,
      url,
      expiresAt: expires.toISOString(),
      expiresInDays: TOKEN_EXPIRY_DAYS,
      project: { id: project.id, name: project.name },
      client: { name: project.clients?.contactName, email: project.clients?.contactEmail },
    })
  } catch (error) {
    console.error('Generate intake link error:', error)
    return NextResponse.json({ error: 'Failed to generate intake link' }, { status: 500 })
  }
}
