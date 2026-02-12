// Dashboard - Intakes Management Page
// For reviewing intake submissions, routing decisions, and manual intake creation (Beside)
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

// Status badge color mapping (matches CRM design system)
const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  REVIEWED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  ROUTED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CLOSED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  DRAFT: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
}

const SCOPE_LABELS: Record<string, string> = {
  WEB: 'Web',
  BRAND: 'Brand',
  BOTH: 'Both',
  UNSURE: 'Unsure',
}

const INTAKE_TYPE_LABELS: Record<string, string> = {
  GUIDED: 'Guided',
  SELF_GUIDED: 'Self-Guided',
  AI_PHONE: 'AI Phone',
}

export default async function IntakesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const filterStatus = params.status || null

  // Fetch counts — catch errors gracefully if table doesn't exist yet
  let counts = { SUBMITTED: 0, REVIEWED: 0, ROUTED: 0, CLOSED: 0, DRAFT: 0 }
  let intakes: any[] = []
  let tableExists = true

  try {
    const [submitted, reviewed, routed, closed, draft] = await Promise.all([
      prisma.intake_submissions.count({ where: { status: 'SUBMITTED' } }),
      prisma.intake_submissions.count({ where: { status: 'REVIEWED' } }),
      prisma.intake_submissions.count({ where: { status: 'ROUTED' } }),
      prisma.intake_submissions.count({ where: { status: 'CLOSED' } }),
      prisma.intake_submissions.count({ where: { status: 'DRAFT' } }),
    ])
    counts = { SUBMITTED: submitted, REVIEWED: reviewed, ROUTED: routed, CLOSED: closed, DRAFT: draft }

    // Fetch intakes with optional status filter
    const where = filterStatus ? { status: filterStatus as any } : {}
    intakes = await prisma.intake_submissions.findMany({
      where,
      orderBy: { submittedAt: 'desc' },
      take: 50,
      include: {
        client: {
          select: {
            contactName: true,
            contactEmail: true,
            companyName: true,
          },
        },
      },
    })
  } catch {
    tableExists = false
  }

  const totalCount = counts.SUBMITTED + counts.REVIEWED + counts.ROUTED + counts.CLOSED + counts.DRAFT

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Intakes
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Review intake submissions and manage routing decisions
          </p>
        </div>
        <Link
          href="/dashboard/intakes/new"
          className="px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
        >
          + Manual Intake (Beside)
        </Link>
      </div>

      {/* Status Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatusCard label="Submitted" count={counts.SUBMITTED} status="SUBMITTED" highlight />
        <StatusCard label="Reviewed" count={counts.REVIEWED} status="REVIEWED" />
        <StatusCard label="Routed" count={counts.ROUTED} status="ROUTED" />
        <StatusCard label="Closed" count={counts.CLOSED} status="CLOSED" />
        <StatusCard label="Draft" count={counts.DRAFT} status="DRAFT" />
      </div>

      {/* Migration Required Notice */}
      {!tableExists && (
        <div className="glass p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-[var(--text)] mb-2">
              Intake System Ready
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Run the Prisma migration to enable the intake tracking system. Intakes
              from the website form and AI phone intake (Beside) will appear here.
            </p>
            <p className="text-xs text-[var(--text-subtle)] font-mono">
              npx prisma migrate dev --name add-intake-system
            </p>
          </div>
        </div>
      )}

      {/* Intake List */}
      {tableExists && totalCount > 0 && (
        <div className="glass overflow-hidden rounded-lg">
          {filterStatus && (
            <div className="px-4 py-2 border-b border-[var(--border)] flex items-center justify-between">
              <span className="text-sm text-[var(--text-muted)]">
                Showing: <span className="text-[var(--text)] font-medium">{filterStatus}</span>
              </span>
              <Link href="/dashboard/intakes" className="text-sm text-amber-400 hover:text-amber-300">
                Clear filter
              </Link>
            </div>
          )}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Contact</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Company</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Type</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Scope</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[var(--text-muted)] font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {intakes.map((intake: any) => (
                <tr key={intake.id} className="border-b border-[var(--border)] hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-[var(--text)]">{intake.client?.contactName || '—'}</div>
                    <div className="text-xs text-[var(--text-subtle)]">{intake.client?.contactEmail || ''}</div>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {intake.client?.companyName || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-[var(--text-muted)]">
                      {INTAKE_TYPE_LABELS[intake.intakeType] || intake.intakeType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-muted)]">
                    {SCOPE_LABELS[intake.scopeType] || intake.scopeType || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border ${STATUS_COLORS[intake.status] || 'text-[var(--text-muted)]'}`}>
                      {intake.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-subtle)] text-xs">
                    {intake.submittedAt
                      ? new Date(intake.submittedAt).toLocaleDateString('en-CA', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state when table exists but no intakes */}
      {tableExists && totalCount === 0 && (
        <div className="glass p-8 text-center">
          <div className="max-w-md mx-auto">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="text-lg font-medium text-[var(--text)] mb-2">
              No intakes yet
            </h3>
            <p className="text-sm text-[var(--text-muted)]">
              Intakes from the website form and AI phone intake (Beside) will appear here.
            </p>
          </div>
        </div>
      )}

      {/* Intake Workflow Documentation */}
      <div className="glass p-6">
        <h2 className="text-lg font-medium text-[var(--text)] mb-4">
          Intake Workflow
        </h2>
        <div className="grid md:grid-cols-4 gap-6 text-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-medium">1</span>
              <span className="font-medium text-[var(--text)]">Intake Received</span>
            </div>
            <p className="text-[var(--text-muted)] pl-8">
              From web form, AI phone (Beside), or manual entry
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-medium">2</span>
              <span className="font-medium text-[var(--text)]">Review & Decide</span>
            </div>
            <p className="text-[var(--text-muted)] pl-8">
              Set fit decision: YES / MAYBE / NO (required)
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-medium">3</span>
              <span className="font-medium text-[var(--text)]">Route</span>
            </div>
            <p className="text-[var(--text-muted)] pl-8">
              Focus Studio Kickoff, Core Discovery, or Hold
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center text-xs font-medium">4</span>
              <span className="font-medium text-[var(--text)]">Close</span>
            </div>
            <p className="text-[var(--text-muted)] pl-8">
              Booking link sent or recommendation email delivered
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusCard({
  label,
  count,
  status,
  highlight,
}: {
  label: string
  count: number
  status: string
  highlight?: boolean
}) {
  return (
    <Link
      href={`/dashboard/intakes?status=${status}`}
      className={`glass p-4 rounded-lg transition-all hover:scale-[1.02] ${
        highlight && count > 0
          ? 'border-amber-500/30 bg-amber-500/5'
          : ''
      }`}
    >
      <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${
        highlight && count > 0
          ? 'text-amber-400'
          : 'text-[var(--text)]'
      }`}>
        {count}
      </p>
    </Link>
  )
}
