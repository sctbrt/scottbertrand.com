// Shared helpers for validating intake access tokens.
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export interface IntakeContext {
  tokenId: string
  projectId: string
  clientId: string
  projectName: string
  clientFirstName: string
  intakeStatus: 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED'
}

export type IntakeTokenError =
  | { ok: false; reason: 'invalid' | 'expired' | 'consumed' | 'submitted' | 'missing-intake' }

export type IntakeTokenResult =
  | { ok: true; ctx: IntakeContext }
  | IntakeTokenError

export function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex')
}

export async function validateIntakeToken(rawToken: string | undefined | null): Promise<IntakeTokenResult> {
  if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
    return { ok: false, reason: 'invalid' }
  }

  const tokenHash = hashToken(rawToken)
  const token = await prisma.intake_access_tokens.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      projectId: true,
      expiresAt: true,
      consumedAt: true,
      project: {
        select: {
          id: true,
          name: true,
          clientId: true,
          clients: { select: { contactName: true } },
          projectIntake: { select: { status: true } },
        },
      },
    },
  })

  if (!token) return { ok: false, reason: 'invalid' }
  if (token.consumedAt) return { ok: false, reason: 'consumed' }
  if (token.expiresAt < new Date()) return { ok: false, reason: 'expired' }
  if (!token.project.projectIntake) return { ok: false, reason: 'missing-intake' }
  if (token.project.projectIntake.status === 'SUBMITTED') {
    return { ok: false, reason: 'submitted' }
  }

  const fullName = token.project.clients?.contactName ?? ''
  const firstName = fullName.split(/\s+/)[0] || 'there'

  return {
    ok: true,
    ctx: {
      tokenId: token.id,
      projectId: token.projectId,
      clientId: token.project.clientId,
      projectName: token.project.name,
      clientFirstName: firstName,
      intakeStatus: token.project.projectIntake.status as IntakeContext['intakeStatus'],
    },
  }
}
