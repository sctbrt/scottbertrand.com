// Dashboard - Project Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ProjectForm } from './project-form'
import { TaskList } from './task-list'
import { MilestoneList } from './milestone-list'

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
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
          >
            ← Back to Projects
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Project
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
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
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          ← Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {project.name}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(project.status)}`}>
                {project.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
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
                className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                View Preview
              </a>
            )}
            <Link
              href={`/dashboard/invoices/new?projectId=${project.id}&clientId=${project.clientId}`}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              Create Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Task Progress</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {taskProgress}%
            </p>
            <p className="text-sm text-gray-400">
              ({completedTasks}/{totalTasks})
            </p>
          </div>
          <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${taskProgress}%` }}
            />
          </div>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Milestones</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {completedMilestones}/{totalMilestones}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Invoiced</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {project.description && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                Description
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {project.description}
              </p>
            </div>
          )}

          {/* Milestones */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                Milestones
              </h2>
            </div>
            <MilestoneList projectId={project.id} milestones={project.milestones} />
          </div>

          {/* Tasks */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                Tasks & Deliverables
              </h2>
            </div>
            <TaskList projectId={project.id} tasks={project.tasks} />
          </div>

          {/* Files */}
          {project.file_assets.length > 0 && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Files ({project.file_assets.length})
              </h2>
              <div className="space-y-2">
                {project.file_assets.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {file.originalName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.size)} · {file.accessLevel}
                      </p>
                    </div>
                    <a
                      href={`/api/files/${file.id}/download`}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
          {/* Project Details */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
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
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Timeline
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Start Date</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {project.startDate ? formatDate(project.startDate) : '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Target End</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {project.targetEndDate ? formatDate(project.targetEndDate) : '—'}
                </span>
              </div>
              {project.actualEndDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Actual End</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDate(project.actualEndDate)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(project.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Last Updated</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(project.updatedAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Recent Invoices */}
          {project.invoices.length > 0 && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                  Recent Invoices
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {project.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="px-6 py-3 block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.createdAt)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900 dark:text-gray-100">
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
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Client Contact
            </h2>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {project.clients.companyName || project.clients.contactName}
              </p>
              {project.clients.companyName && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {project.clients.contactName}
                </p>
              )}
              <a
                href={`mailto:${project.clients.contactEmail}`}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline block"
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
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return colors[status] || colors.DRAFT
}

function getInvoiceStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'text-gray-500 dark:text-gray-400',
    SENT: 'text-blue-600 dark:text-blue-400',
    VIEWED: 'text-purple-600 dark:text-purple-400',
    PAID: 'text-green-600 dark:text-green-400',
    OVERDUE: 'text-red-600 dark:text-red-400',
    CANCELLED: 'text-gray-500 dark:text-gray-400',
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
