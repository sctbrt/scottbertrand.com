// Dashboard Overview Page - V3 Glass Aesthetic
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function DashboardPage() {
  // Fetch counts for overview
  const [leadCount, clientCount, projectCount, invoiceCount] = await Promise.all([
    prisma.lead.count({ where: { status: 'NEW' } }),
    prisma.client.count(),
    prisma.project.count({ where: { status: { in: ['IN_PROGRESS', 'PENDING_APPROVAL'] } } }),
    prisma.invoice.count({ where: { status: { in: ['SENT', 'OVERDUE'] } } }),
  ])

  // Fetch recent leads
  const recentLeads = await prisma.lead.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      name: true,
      service: true,
      status: true,
      createdAt: true,
    },
  })

  // Fetch active projects
  const activeProjects = await prisma.project.findMany({
    where: { status: { in: ['IN_PROGRESS', 'PENDING_APPROVAL'] } },
    take: 5,
    orderBy: { updatedAt: 'desc' },
    include: {
      client: {
        select: { contactName: true, companyName: true },
      },
    },
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-medium text-[var(--text)] tracking-tight">
          Dashboard
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Overview of leads, clients, projects, and invoices
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="New Leads"
          value={leadCount}
          href="/dashboard/leads"
        />
        <StatCard
          title="Clients"
          value={clientCount}
          href="/dashboard/clients"
        />
        <StatCard
          title="Active Projects"
          value={projectCount}
          href="/dashboard/projects"
        />
        <StatCard
          title="Unpaid Invoices"
          value={invoiceCount}
          href="/dashboard/invoices"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="glass glass--card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[var(--text)]">
              Recent Leads
            </h2>
            <Link
              href="/dashboard/leads"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {recentLeads.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-muted)] text-center">
                No leads yet
              </p>
            ) : (
              recentLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/dashboard/leads/${lead.id}`}
                  className="py-3 block hover:bg-[var(--accent-subtle)] -mx-4 px-4 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {lead.name || lead.email}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {lead.service || 'No service specified'}
                      </p>
                    </div>
                    <span className={`status-badge ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Active Projects */}
        <div className="glass glass--card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-medium text-[var(--text)]">
              Active Projects
            </h2>
            <Link
              href="/dashboard/projects"
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)]"
            >
              View all →
            </Link>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {activeProjects.length === 0 ? (
              <p className="py-8 text-sm text-[var(--text-muted)] text-center">
                No active projects
              </p>
            ) : (
              activeProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/projects/${project.id}`}
                  className="py-3 block hover:bg-[var(--accent-subtle)] -mx-4 px-4 transition-colors first:rounded-t-lg last:rounded-b-lg"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--text)]">
                        {project.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {project.client.companyName || project.client.contactName}
                      </p>
                    </div>
                    <span className={`status-badge ${getProjectStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component - V3 Glass
function StatCard({
  title,
  value,
  href,
}: {
  title: string
  value: number
  href: string
}) {
  return (
    <Link
      href={href}
      className="glass glass--stat hover:border-[var(--accent)] transition-colors"
    >
      <p className="text-sm text-[var(--text-muted)] mb-2">{title}</p>
      <p className="text-3xl font-medium text-[var(--accent)]">
        {value}
      </p>
    </Link>
  )
}

// Status color helpers - using accent-based system
function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    NEW: 'bg-[var(--accent-muted)] text-[var(--accent)]',
    CONTACTED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    QUALIFIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    CONVERTED: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
    DISQUALIFIED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    ARCHIVED: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
  }
  return colors[status] || colors.NEW
}

function getProjectStatusColor(status: string) {
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
