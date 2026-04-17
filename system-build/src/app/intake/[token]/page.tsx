// Public intake form — token-gated, no auth required.
// Renders different states (invalid / expired / submitted / form / thanks) based on token validation.

import type { Metadata } from 'next'
import { validateIntakeToken } from '@/lib/intake/token'
import { prisma } from '@/lib/prisma'
import { SECTIONS, ESTIMATED_MINUTES } from '@/lib/intake/question-set'
import { IntakeForm } from './intake-form'
import { IntakeShell } from './intake-shell'
import { IntakeError } from './intake-error'

export const metadata: Metadata = {
  title: 'Project Intake',
  description: 'A guided questionnaire for your brand and web project.',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function IntakePage({ params }: PageProps) {
  const { token } = await params
  const result = await validateIntakeToken(token)

  if (!result.ok) {
    return (
      <IntakeShell>
        <IntakeError reason={result.reason} />
      </IntakeShell>
    )
  }

  const [intake, project] = await Promise.all([
    prisma.project_intakes.findUnique({
      where: { projectId: result.ctx.projectId },
      select: { responses: true, currentSection: true, status: true },
    }),
    prisma.projects.findUnique({
      where: { id: result.ctx.projectId },
      select: { clients: { select: { companyName: true, contactName: true } } },
    }),
  ])

  // Prefill 1.1 (business name) from the client record, but only if not already answered
  const responses = { ...((intake?.responses as Record<string, unknown>) ?? {}) }
  if (!responses['1.1']) {
    const businessName = project?.clients?.companyName ?? project?.clients?.contactName ?? ''
    if (businessName) responses['1.1'] = businessName
  }

  return (
    <IntakeShell>
      <IntakeForm
        token={token}
        clientFirstName={result.ctx.clientFirstName}
        projectName={result.ctx.projectName}
        sections={SECTIONS}
        estimatedMinutes={ESTIMATED_MINUTES}
        initialResponses={responses}
        initialSection={intake?.currentSection ?? 1}
      />
    </IntakeShell>
  )
}
