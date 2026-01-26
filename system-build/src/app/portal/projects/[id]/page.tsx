// Client Portal - Project Detail Page
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const session = await auth()
  if (!session?.user) return null

  const { id } = await params

  // Get client and verify ownership
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!client && session.user.role !== 'INTERNAL_ADMIN') {
    notFound()
  }

  // Fetch project with all related data
  const project = await prisma.projects.findFirst({
    where: {
      id,
      // Only show client's own projects (unless admin)
      ...(session.user.role === 'CLIENT' ? { clientId: client?.id } : {}),
    },
    include: {
      service_templates: true,
      milestones: {
        orderBy: { sortOrder: 'asc' },
      },
      tasks: {
        where: { isClientVisible: true },
        orderBy: { sortOrder: 'asc' },
      },
      file_assets: {
        where: { accessLevel: { in: ['PUBLIC', 'CLIENT_VISIBLE'] } },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!project) {
    notFound()
  }

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/portal"
        className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
      >
        ← Back to Projects
      </Link>

      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {project.name}
          </h1>
          {project.service_templates && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {project.service_templates.name}
            </p>
          )}
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(project.status)}`}>
          {formatStatus(project.status)}
        </span>
      </div>

      {/* Project Description */}
      {project.description && (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Overview
          </h2>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {project.description}
          </p>
        </div>
      )}

      {/* Timeline */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Timeline
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Start Date</p>
            <p className="text-gray-900 dark:text-gray-100">
              {project.startDate ? formatDate(project.startDate) : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Target Completion</p>
            <p className="text-gray-900 dark:text-gray-100">
              {project.targetEndDate ? formatDate(project.targetEndDate) : 'Not set'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Last Updated</p>
            <p className="text-gray-900 dark:text-gray-100">
              {formatDate(project.updatedAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Preview Link */}
      {project.previewUrl && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h2 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            Preview Available
          </h2>
          <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
            A preview of your project is available for review.
          </p>
          <a
            href={project.previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            View Preview
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Milestones */}
      {project.milestones.length > 0 && (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Milestones
          </h2>
          <div className="space-y-4">
            {project.milestones.map((milestone, index) => (
              <div
                key={milestone.id}
                className="flex items-start gap-4 pb-4 border-b border-gray-100 dark:border-gray-700 last:border-0 last:pb-0"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getMilestoneStatusBg(milestone.status)}`}>
                  {getMilestoneIcon(milestone.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {index + 1}. {milestone.name}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded ${getMilestoneStatusColor(milestone.status)}`}>
                      {formatMilestoneStatus(milestone.status)}
                    </span>
                  </div>
                  {milestone.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {milestone.description}
                    </p>
                  )}
                  {milestone.dueDate && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                      Due: {formatDate(milestone.dueDate)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Deliverables / Tasks */}
      {project.tasks.length > 0 && (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Deliverables Checklist
          </h2>
          <div className="space-y-3">
            {project.tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                  task.status === 'COMPLETED'
                    ? 'bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {task.status === 'COMPLETED' && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className={`text-sm ${
                  task.status === 'COMPLETED'
                    ? 'text-gray-500 dark:text-gray-400 line-through'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared Files */}
      {project.file_assets.length > 0 && (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
            Shared Files
          </h2>
          <div className="space-y-3">
            {project.file_assets.map((file) => (
              <a
                key={file.id}
                href={`/api/files/${file.id}/download`}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {file.originalName}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)} · {formatDate(file.createdAt)}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}
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

function formatStatus(status: string) {
  return status.replace('_', ' ')
}

function getMilestoneStatusBg(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 dark:bg-gray-700',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30',
    AWAITING_APPROVAL: 'bg-yellow-100 dark:bg-yellow-900/30',
    APPROVED: 'bg-green-100 dark:bg-green-900/30',
    COMPLETED: 'bg-green-100 dark:bg-green-900/30',
  }
  return colors[status] || colors.PENDING
}

function getMilestoneStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    AWAITING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }
  return colors[status] || colors.PENDING
}

function getMilestoneIcon(status: string) {
  if (status === 'COMPLETED' || status === 'APPROVED') {
    return (
      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    )
  }
  if (status === 'IN_PROGRESS') {
    return <span className="w-2 h-2 bg-blue-500 rounded-full" />
  }
  if (status === 'AWAITING_APPROVAL') {
    return <span className="w-2 h-2 bg-yellow-500 rounded-full" />
  }
  return <span className="w-2 h-2 bg-gray-300 dark:bg-gray-500 rounded-full" />
}

function formatMilestoneStatus(status: string) {
  return status.replace('_', ' ')
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
