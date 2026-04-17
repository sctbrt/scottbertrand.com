// Admin-only viewer for submitted project intake responses.
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { SECTIONS, type Question } from '@/lib/intake/question-set'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function IntakeResponsesPage({ params }: PageProps) {
  const { id } = await params
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    redirect('/login')
  }

  const project = await prisma.projects.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      clients: { select: { contactName: true, companyName: true } },
      projectIntake: {
        select: {
          status: true,
          responses: true,
          submittedAt: true,
          startedAt: true,
          timeToComplete: true,
          currentSection: true,
        },
      },
    },
  })
  if (!project) notFound()

  const intake = project.projectIntake
  const responses = (intake?.responses as Record<string, unknown>) ?? {}

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <Link
          href={`/dashboard/projects/${id}`}
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
        >
          ← Back to Project
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--text)]">{project.name} — Intake Responses</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {project.clients.companyName ?? project.clients.contactName}
        </p>
      </div>

      {!intake && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-6 text-sm text-[var(--text-muted)]">
          No intake started yet. Generate a link from the project page to send to the client.
        </div>
      )}

      {intake && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <Stat label="Status" value={intake.status} />
            <Stat label="Submitted" value={intake.submittedAt ? formatDate(intake.submittedAt) : '—'} />
            <Stat
              label="Time to complete"
              value={intake.timeToComplete ? `${Math.round(intake.timeToComplete / 60)} min` : '—'}
            />
            <Stat
              label="Section"
              value={`${intake.currentSection} / ${SECTIONS.length}`}
            />
          </div>

          {SECTIONS.map((section) => (
            <div key={section.id} className="space-y-4">
              <div className="flex items-baseline gap-3 border-b border-[var(--border)] pb-2">
                <span className="text-[11px] tracking-[0.18em] uppercase text-[var(--accent)]">
                  Section {section.id}
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)]">{section.title}</h2>
              </div>
              <div className="space-y-5">
                {section.questions.map((q) => (
                  <Answer key={q.id} question={q} value={responses[q.id]} />
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
      <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
      <div className="text-sm text-[var(--text)] mt-0.5">{value}</div>
    </div>
  )
}

function Answer({ question, value }: { question: Question; value: unknown }) {
  const formatted = formatValue(question, value)
  const isEmpty = !formatted
  return (
    <div>
      <div className="text-sm font-medium text-[var(--text)]">{question.prompt}</div>
      {question.microcopy && (
        <div className="text-xs italic text-[var(--text-subtle)] mt-0.5">{question.microcopy}</div>
      )}
      <div
        className={`mt-1.5 text-sm whitespace-pre-wrap ${
          isEmpty ? 'text-[var(--text-subtle)] italic' : 'text-[var(--text-muted)]'
        }`}
      >
        {formatted || '— (no answer)'}
      </div>
    </div>
  )
}

function formatValue(q: Question, raw: unknown): string {
  if (raw === undefined || raw === null) return ''
  if (typeof raw === 'string') return raw.trim()
  if (Array.isArray(raw)) {
    if (q.type === 'paired-inputs') {
      return (raw as Array<{ brand: string; word: string }>)
        .filter((p) => p.brand || p.word)
        .map((p) => `${p.brand || '—'} → ${p.word || '—'}`)
        .join('\n')
    }
    if (q.type === 'word-list') {
      return (raw as string[]).filter(Boolean).join(', ')
    }
    // chips/tiles/archetypes — translate via options
    const labels = (raw as string[])
      .map((v) => q.options?.find((o) => o.value === v)?.label ?? v)
    return labels.join(', ')
  }
  return ''
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

// Avoid statically caching when intake is in progress
export const dynamic = 'force-dynamic'
