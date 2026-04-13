// Client Portal - Projects List - V3 Glass Aesthetic
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

function getGreeting() {
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

export default async function PortalPage() {
  const session = await auth()
  if (!session?.user) return null

  // Get client's projects
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    include: {
      projects: {
        orderBy: { updatedAt: 'desc' },
        include: {
          milestones: {
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          service_templates: {
            select: { name: true },
          },
        },
      },
    },
  })

  const projects = client?.projects || []
  const clientName = client?.contactName?.split(' ')[0] || session.user.name?.split(' ')[0] || 'there'
  const greeting = getGreeting()

  return (
    <div className="space-y-8">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500/10 via-transparent to-orange-500/5 border border-amber-500/20 p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <p className="text-sm font-medium text-[var(--accent)] tracking-wider uppercase mb-2">
            {greeting}
          </p>
          <h1 className="text-3xl md:text-4xl font-semibold text-[var(--text)] tracking-tight">
            Welcome, <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent">{clientName}</span>
          </h1>
          <p className="text-[var(--text-muted)] mt-2 text-lg">
            Track your projects and stay updated on progress.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-[var(--text)] tracking-tight">
          Your Projects
        </h2>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          View project status, deliverables, and milestones
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="glass glass--card text-center py-16">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-500/20 to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-amber-500/20">
            <svg className="w-10 h-10 text-amber-500/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium text-[var(--text)] mb-3">
            No projects yet
          </h2>
          <p className="text-sm text-[var(--text-muted)] max-w-sm mx-auto">
            Your projects will appear here once work begins. We&apos;ll notify you when there&apos;s something to see.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/projects/${project.id}`}
              className="block glass glass--card hover:border-[var(--accent)] hover:scale-[1.01] transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text)] mb-1">
                    {project.name}
                  </h2>
                  {project.service_templates && (
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      {project.service_templates.name}
                    </p>
                  )}
                </div>
                <span className={`status-badge ${getStatusColor(project.status)}`}>
                  {formatStatus(project.status)}
                </span>
              </div>

              {/* Progress / Milestones Preview */}
              {project.milestones.length > 0 && (
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)] mb-2 uppercase tracking-wider">
                    Upcoming Milestones
                  </p>
                  <div className="space-y-2">
                    {project.milestones.map((milestone) => (
                      <div key={milestone.id} className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${getMilestoneColor(milestone.status)}`} />
                        <span className="text-sm text-[var(--text)]">
                          {milestone.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center text-sm text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors">
                <span>View details</span>
                <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    PENDING_APPROVAL: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    ON_HOLD: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    COMPLETED: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    CANCELLED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  }
  return colors[status] || colors.DRAFT
}

function formatStatus(status: string) {
  return status.replace('_', ' ')
}

function getMilestoneColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-[var(--text-muted)]',
    IN_PROGRESS: 'bg-[var(--accent)]',
    AWAITING_APPROVAL: 'bg-amber-500',
    APPROVED: 'bg-emerald-500',
    COMPLETED: 'bg-emerald-500',
  }
  return colors[status] || colors.PENDING
}
