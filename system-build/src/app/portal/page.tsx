// Client Portal — Projects list (/portal)
//
// Shows the client's active projects. Each card links to the canonical
// Delivery Room at /p/[publicId].
//
// Workstream C Phase 1 changes vs. the previous version:
//   - Status chip routed through <StatusPill> (icon + translated text +
//     aria-label). No more raw enum strings ("PENDING_APPROVAL", "DRAFT")
//     leaking into the UI.
//   - Removed the per-project milestones preview — spec §13.5 forbids
//     exposing milestones to clients, and a color-only dot row fails
//     WCAG for colour-blind/elder users.
//   - Each project link now points at /p/{publicId}, the canonical single-page
//     Delivery Room. Legacy /portal/projects/[id] URLs still work (they
//     redirect), but new navigation goes direct.
//   - Greeting copy and empty-state copy preserved from the previous version
//     — those carry a warm tone that matches Workstream A/B.
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { StatusPill } from '@/components/portal/status-pill'
import { labelFor } from '@/lib/portal/labels'

function getGreeting(): string {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: false,
  })
  const h = parseInt(hour)
  if (h >= 5 && h < 12) return 'Good morning'
  if (h >= 12 && h < 17) return 'Good afternoon'
  if (h >= 17 && h < 21) return 'Good evening'
  return 'Hello'
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export default async function PortalPage() {
  const session = await auth()
  if (!session?.user) return null

  // Fetch the client's projects. Intentionally NOT including milestones/tasks
  // or file_assets — those are forbidden on the client surface per spec §13.5.
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    include: {
      projects: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          publicId: true,
          name: true,
          status: true,
          portalStage: true,
          nextMilestoneLabel: true,
          nextMilestoneDueAt: true,
          lastUpdateAt: true,
          service_templates: { select: { name: true } },
        },
      },
    },
  })

  const projects = client?.projects || []
  const clientName =
    client?.contactName?.split(' ')[0] || session.user.name?.split(' ')[0] || 'there'
  const greeting = getGreeting()

  return (
    <div className="space-y-8">
      {/* Welcome Hero — copy preserved from previous version */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 border border-amber-500/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <p className="text-sm font-medium text-[var(--accent)] tracking-wider uppercase mb-2">
            {greeting}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text)] tracking-tight">
            Welcome,{' '}
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">
              {clientName}
            </span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 text-lg">
            Where your projects stand.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[var(--text)] tracking-tight">
          Your projects
        </h2>
      </div>

      {projects.length === 0 ? (
        <div className="glass glass--card text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <svg
              className="w-10 h-10 text-amber-500/60"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-[var(--text)] mb-3">
            Nothing here yet
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Your projects will show up here once work begins. We&rsquo;ll let you
            know when there&rsquo;s something to see.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => {
            const nextStep = labelFor('PortalStage', project.portalStage).text
            return (
              <Link
                key={project.id}
                href={`/p/${project.publicId}`}
                className="block glass glass--card hover:border-[var(--accent)] transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-medium text-[var(--text)] mb-1 truncate">
                      {project.name}
                    </h2>
                    {project.service_templates && (
                      <p className="text-sm text-[var(--text-muted)] mb-3">
                        {project.service_templates.name}
                      </p>
                    )}
                  </div>
                  <StatusPill domain="PortalStage" value={project.portalStage} />
                </div>

                <div className="mt-4 pt-4 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                      Next
                    </p>
                    <p className="text-sm text-[var(--text)]">
                      {project.nextMilestoneLabel || nextStep}
                      {project.nextMilestoneDueAt && (
                        <span className="text-[var(--text-muted)] font-normal">
                          {' '}
                          (by {formatDate(project.nextMilestoneDueAt)})
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                      Last update
                    </p>
                    <p className="text-sm text-[var(--text)]">
                      {formatDate(project.lastUpdateAt)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center text-sm text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                  <span>Open your project</span>
                  <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
