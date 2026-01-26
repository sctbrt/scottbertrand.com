// Client Portal - Projects List - V3 Glass Aesthetic
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function PortalPage() {
  const session = await auth()
  if (!session?.user) return null

  // Get client's projects
  const client = await prisma.client.findUnique({
    where: { userId: session.user.id },
    include: {
      projects: {
        orderBy: { updatedAt: 'desc' },
        include: {
          milestones: {
            orderBy: { sortOrder: 'asc' },
            take: 3,
          },
          serviceTemplate: {
            select: { name: true },
          },
        },
      },
    },
  })

  const projects = client?.projects || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-[var(--text)] tracking-tight">
          Your Projects
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          View project status, deliverables, and milestones
        </p>
      </div>

      {projects.length === 0 ? (
        <div className="glass glass--card text-center py-12">
          <div className="w-16 h-16 bg-[var(--surface-2)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[var(--text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-[var(--text)] mb-2">
            No projects yet
          </h2>
          <p className="text-sm text-[var(--text-muted)]">
            Your projects will appear here once work begins.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/projects/${project.id}`}
              className="block glass glass--card hover:border-[var(--accent)] transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-medium text-[var(--text)] mb-1">
                    {project.name}
                  </h2>
                  {project.serviceTemplate && (
                    <p className="text-sm text-[var(--text-muted)] mb-3">
                      {project.serviceTemplate.name}
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

              <div className="mt-4 flex items-center text-sm text-[var(--accent)]">
                <span>View details →</span>
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
    DRAFT: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
    PENDING_APPROVAL: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    IN_PROGRESS: 'bg-[var(--accent-muted)] text-[var(--accent)]',
    ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
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
