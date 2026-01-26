'use client'

// Milestone List Component with inline editing
import { useActionState, useState } from 'react'
import { createMilestone, updateMilestone, deleteMilestone, updateMilestoneStatus } from '@/lib/actions/milestones'

interface Milestone {
  id: string
  name: string
  description: string | null
  status: string
  dueDate: Date | null
  completedAt: Date | null
  requiresApproval: boolean
  approvedAt: Date | null
  approvalNotes: string | null
  sortOrder: number
}

interface MilestoneListProps {
  projectId: string
  milestones: Milestone[]
}

export function MilestoneList({ projectId, milestones }: MilestoneListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {/* Milestone Items */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {milestones.length === 0 && !showForm ? (
          <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            No milestones yet. Add your first milestone below.
          </p>
        ) : (
          milestones.map((milestone, index) => (
            <MilestoneItem
              key={milestone.id}
              milestone={milestone}
              projectId={projectId}
              index={index}
            />
          ))
        )}
      </div>

      {/* Add Milestone Form */}
      {showForm ? (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <AddMilestoneForm
            projectId={projectId}
            onCancel={() => setShowForm(false)}
            onSuccess={() => setShowForm(false)}
          />
        </div>
      ) : (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            + Add Milestone
          </button>
        </div>
      )}
    </div>
  )
}

function MilestoneItem({
  milestone,
  projectId,
  index,
}: {
  milestone: Milestone
  projectId: string
  index: number
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [, updateStatusAction, isUpdating] = useActionState(
    updateMilestoneStatus.bind(null, milestone.id),
    null
  )

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData()
    formData.append('status', newStatus)
    updateStatusAction(formData)
  }

  if (isEditing) {
    return (
      <div className="p-4">
        <EditMilestoneForm
          milestone={milestone}
          projectId={projectId}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="px-6 py-4 flex items-start gap-4 group">
      {/* Status Icon */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${getStatusBgColor(milestone.status)}`}>
        {getStatusIcon(milestone.status)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400 dark:text-gray-500">{index + 1}.</span>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {milestone.name}
          </h3>
          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(milestone.status)}`}>
            {milestone.status.replace('_', ' ')}
          </span>
        </div>
        {milestone.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {milestone.description}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
          {milestone.dueDate && (
            <span>Due: {formatDate(milestone.dueDate)}</span>
          )}
          {milestone.requiresApproval && (
            <span className="text-blue-500 dark:text-blue-400">Requires approval</span>
          )}
          {milestone.completedAt && (
            <span className="text-green-500 dark:text-green-400">
              Completed: {formatDate(milestone.completedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Quick Status Actions */}
        {milestone.status !== 'COMPLETED' && (
          <select
            value={milestone.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={isUpdating}
            className="text-xs px-2 py-1 border border-gray-200 dark:border-gray-700 rounded bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="AWAITING_APPROVAL">Awaiting Approval</option>
            <option value="APPROVED">Approved</option>
            <option value="COMPLETED">Completed</option>
          </select>
        )}

        {/* Edit Button */}
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-opacity"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function AddMilestoneForm({
  projectId,
  onCancel,
  onSuccess,
}: {
  projectId: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const action = createMilestone.bind(null, projectId)
  const [state, formAction, isPending] = useActionState(action, null)

  if (state?.success) {
    onSuccess()
  }

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="name"
        required
        placeholder="Milestone name"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm resize-none"
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            name="requiresApproval"
            value="true"
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Requires client approval
        </label>
        <input
          type="date"
          name="dueDate"
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {isPending ? 'Adding...' : 'Add Milestone'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

function EditMilestoneForm({
  milestone,
  projectId: _projectId,
  onCancel,
  onSuccess,
}: {
  milestone: Milestone
  projectId: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const action = updateMilestone.bind(null, milestone.id)
  const deleteAction = deleteMilestone.bind(null, milestone.id)
  const [state, formAction, isPending] = useActionState(action, null)
  const [, deleteFormAction, isDeleting] = useActionState(deleteAction, null)

  if (state?.success) {
    onSuccess()
  }

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="name"
        required
        defaultValue={milestone.name}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
      />
      <textarea
        name="description"
        rows={2}
        defaultValue={milestone.description || ''}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm resize-none"
      />
      <div className="flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            name="requiresApproval"
            value="true"
            defaultChecked={milestone.requiresApproval}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Requires approval
        </label>
        <input
          type="date"
          name="dueDate"
          defaultValue={milestone.dueDate ? formatDateInput(milestone.dueDate) : ''}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        />
        <select
          name="status"
          defaultValue={milestone.status}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="AWAITING_APPROVAL">Awaiting Approval</option>
          <option value="APPROVED">Approved</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-1.5 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm"
        >
          Cancel
        </button>
        <form action={deleteFormAction} className="ml-auto">
          <button
            type="submit"
            disabled={isDeleting}
            className="px-3 py-1.5 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </form>
      </div>
    </form>
  )
}

function getStatusBgColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 dark:bg-gray-700',
    IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30',
    AWAITING_APPROVAL: 'bg-yellow-100 dark:bg-yellow-900/30',
    APPROVED: 'bg-green-100 dark:bg-green-900/30',
    COMPLETED: 'bg-green-100 dark:bg-green-900/30',
  }
  return colors[status] || colors.PENDING
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    AWAITING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    APPROVED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  }
  return colors[status] || colors.PENDING
}

function getStatusIcon(status: string) {
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
