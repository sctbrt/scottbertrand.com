// Dashboard - Project Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectForm } from './project-form'
import { TaskList } from './task-list'
import { MilestoneList } from './milestone-list'
import { PaymentSection } from './payment-section'

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = await params

  // Handle "new" as a special case
  if (id === 'new') {
    const [clients, templates] = await Promise.all([
      prisma.clients.findMany({
        select: { id: true, companyName: true, contactName: true },
        orderBy: { companyName: 'asc' },
      }),
      prisma.service_templates.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ])

    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Create New Project
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Set up a new project for a client
          </p>
        </div>
        <div className="max-w-2xl">
          <ProjectForm clients={clients} templates={templates} />
        </div>
      </div>
    )
  }

  const [project, clients, templates] = await Promise.all([
    prisma.projects.findUnique({
      where: { id },
      include: {
        clients: {
          select: { id: true, companyName: true, contactName: true, contactEmail: true },
        },
        service_templates: true,
        tasks: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
        milestones: {
          orderBy: { sortOrder: 'asc' },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        file_assets: {
          orderBy: { createdAt: 'desc' },
        },
        comments: {
          orderBy: { createdAt: 'desc' },
          include: {
            users: { select: { name: true, email: true, role: true } },
          },
        },
        // Payment events for audit (last 5)
        paymentEvents: {
          orderBy: { processedAt: 'desc' },
          take: 5,
        },
      },
    }),
    prisma.clients.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { companyName: 'asc' },
    }),
    prisma.service_templates.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!project) {
    notFound()
  }

  // Calculate task completion
  const completedTasks = project.tasks.filter((t) => t.status === 'COMPLETED').length
  const totalTasks = project.tasks.length
  const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate milestone completion
  const completedMilestones = project.milestones.filter(
    (m) => m.status === 'COMPLETED' || m.status === 'APPROVED'
  ).length
  const totalMilestones = project.milestones.length

  // Calculate invoice totals
  const totalInvoiced = project.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalPaid = project.invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/projects"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
        >
          ← Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                {project.name}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
              <span className={`text-sm px-3 py-1 rounded-full ${getPaymentStatusColor(project.paymentStatus)}`}>
                {project.paymentStatus === 'PAID' ? '✓ Paid' : project.paymentStatus === 'REFUNDED' ? 'Refunded' : 'Unpaid'}
              </span>
            </div>
            <p className="text-[var(--text-muted)] mt-1">
              <Link
                href={`/dashboard/clients/${project.clients.id}`}
                className="hover:underline"
              >
                {project.clients.companyName || project.clients.contactName}
              </Link>
              {project.service_templates && (
                <> · {project.service_templates.name}</>
              )}
            </p>
          </div>
          <div className="flex gap-3">
            {project.previewUrl && (
              <a
                href={project.previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-sky-500/10 text-sky-400 rounded-lg text-sm font-medium hover:bg-sky-500/20 transition-colors"
              >
                View Preview
              </a>
            )}
            <Link
              href={`/dashboard/invoices/new?projectId=${project.id}&clientId=${project.clientId}`}
              className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors"
            >
              Create Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Task Progress</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-semibold text-[var(--text)]">
              {taskProgress}%
            </p>
            <p className="text-sm text-gray-400">
              ({completedTasks}/{totalTasks})
            </p>
          </div>
          <div className="mt-2 h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Milestones</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">
            {completedMilestones}/{totalMilestones}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Invoiced</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Paid</p>
          <p className="text-2xl font-semibold text-[var(--success-text)] mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Description
              </h2>
              <p className="text-[var(--text)] whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          {/* Milestones */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-medium text-[var(--text)]">
                Milestones
              </h2>
            </div>
            <MilestoneList projectId={project.id} milestones={project.milestones} />
          </div>

          {/* Tasks */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-medium text-[var(--text)]">
                Tasks & Deliverables
              </h2>
            </div>
            <TaskList projectId={project.id} tasks={project.tasks} />
          </div>

          {/* Files */}
          {project.file_assets.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Files ({project.file_assets.length})
              </h2>
              <div className="space-y-2">
                {project.file_assets.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-[var(--surface-2)]/50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-[var(--surface-2)] rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text)] truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {formatFileSize(file.size)} · {file.accessLevel}
                      </p>
                    </div>
                    <a
                      href={`/api/files/${file.id}/download`}
                      className="text-[var(--text-muted)] hover:text-[var(--text)]"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <PaymentSection
            project={{
              id: project.id,
              publicId: project.publicId,
              paymentStatus: project.paymentStatus,
              paymentProvider: project.paymentProvider,
              paymentRequired: project.paymentRequired,
              paidAt: project.paidAt,
              stripePaymentLinkId: project.stripePaymentLinkId,
              stripePaymentLinkUrl: project.stripePaymentLinkUrl,
            }}
          />

          {/* Project Details */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Project Details
            </h2>
            <ProjectForm
              project={project}
              clients={clients}
              templates={templates}
              compact
            />
          </div>

          {/* Timeline */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Start Date</span>
                <span className="text-[var(--text)]">
                  {project.startDate ? formatDate(project.startDate) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Target End</span>
                <span className="text-[var(--text)]">
                  {project.targetEndDate ? formatDate(project.targetEndDate) : '—'}
                </span>
              </div>
              {project.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Actual End</span>
                  <span className="text-[var(--text)]">
                    {formatDate(project.actualEndDate)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Created</span>
                <span className="text-[var(--text)]">
                  {formatDate(project.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Last Updated</span>
                <span className="text-[var(--text)]">
                  {formatDate(project.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          {project.invoices.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="font-medium text-[var(--text)] text-sm">
                  Recent Invoices
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {project.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="px-6 py-3 block hover:bg-[var(--accent-subtle)]/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-[var(--text)]">
                          {formatCurrency(Number(invoice.total))}
                        </p>
                        <span className={`text-xs ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Client Contact */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Client Contact
            </h2>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--text)]">
                {project.clients.companyName || project.clients.contactName}
              </p>
              {project.clients.companyName && (
                <p className="text-sm text-[var(--text-muted)]">
                  {project.clients.contactName}
                </p>
              )}
              <a
                href={`mailto:${project.clients.contactEmail}`}
                className="text-sm text-sky-400 hover:underline block"
              >
                {project.clients.contactEmail}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
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

function getPaymentStatusColor(status: string) {
  const colors: Record<string, string> = {
    UNPAID: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    PAID: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    REFUNDED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  }
  return colors[status] || colors.UNPAID
}

function getInvoiceStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'text-[var(--text-muted)]',
    SENT: 'text-sky-400',
    VIEWED: 'text-violet-400',
    PAID: 'text-[var(--success-text)]',
    OVERDUE: 'text-[var(--error-text)]',
    CANCELLED: 'text-[var(--text-muted)]',
  }
  return colors[status] || colors.DRAFT
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
