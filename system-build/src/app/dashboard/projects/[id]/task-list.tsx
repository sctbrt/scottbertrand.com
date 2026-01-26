'use client'

// Task List Component with inline editing
import { useActionState, useState } from 'react'
import { createTask, updateTask, deleteTask, updateTaskStatus } from '@/lib/actions/tasks'

interface Task {
  id: string
  title: string
  description: string | null
  status: string
  priority: number
  dueDate: Date | null
  isClientVisible: boolean
  sortOrder: number
}

interface TaskListProps {
  projectId: string
  tasks: Task[]
}

export function TaskList({ projectId, tasks }: TaskListProps) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div>
      {/* Task Items */}
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {tasks.length === 0 && !showForm ? (
          <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
            No tasks yet. Add your first task below.
          </p>
        ) : (
          tasks.map((task) => (
            <TaskItem key={task.id} task={task} projectId={projectId} />
          ))
        )}
      </div>

      {/* Add Task Form */}
      {showForm ? (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <AddTaskForm
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
            + Add Task
          </button>
        </div>
      )}
    </div>
  )
}

function TaskItem({ task, projectId }: { task: Task; projectId: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [, updateStatusAction, isUpdating] = useActionState(
    updateTaskStatus.bind(null, task.id),
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
        <EditTaskForm
          task={task}
          projectId={projectId}
          onCancel={() => setIsEditing(false)}
          onSuccess={() => setIsEditing(false)}
        />
      </div>
    )
  }

  return (
    <div className="px-6 py-3 flex items-center gap-3 group">
      {/* Status Checkbox */}
      <button
        onClick={() => handleStatusChange(task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED')}
        disabled={isUpdating}
        className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
          task.status === 'COMPLETED'
            ? 'bg-green-100 border-green-500 text-green-600 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        }`}
      >
        {task.status === 'COMPLETED' && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${
          task.status === 'COMPLETED'
            ? 'text-gray-500 dark:text-gray-400 line-through'
            : 'text-gray-900 dark:text-gray-100'
        }`}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
            {task.description}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2">
        {task.isClientVisible && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            Visible
          </span>
        )}
        {task.dueDate && (
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(task.dueDate)}
          </span>
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

function AddTaskForm({
  projectId,
  onCancel,
  onSuccess,
}: {
  projectId: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const action = createTask.bind(null, projectId)
  const [state, formAction, isPending] = useActionState(action, null)

  if (state?.success) {
    onSuccess()
  }

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="title"
        required
        placeholder="Task title"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            name="isClientVisible"
            value="true"
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Visible to client
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
          {isPending ? 'Adding...' : 'Add Task'}
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

function EditTaskForm({
  task,
  projectId: _projectId,
  onCancel,
  onSuccess,
}: {
  task: Task
  projectId: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const action = updateTask.bind(null, task.id)
  const deleteAction = deleteTask.bind(null, task.id)
  const [state, formAction, isPending] = useActionState(action, null)
  const [, deleteFormAction, isDeleting] = useActionState(deleteAction, null)

  if (state?.success) {
    onSuccess()
  }

  return (
    <form action={formAction} className="space-y-3">
      <input
        type="text"
        name="title"
        required
        defaultValue={task.title}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
      />
      <textarea
        name="description"
        rows={2}
        defaultValue={task.description || ''}
        placeholder="Description (optional)"
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm resize-none"
      />
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            name="isClientVisible"
            value="true"
            defaultChecked={task.isClientVisible}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Visible to client
        </label>
        <input
          type="date"
          name="dueDate"
          defaultValue={task.dueDate ? formatDateInput(task.dueDate) : ''}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        />
        <select
          name="status"
          defaultValue={task.status}
          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
        >
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="BLOCKED">Blocked</option>
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

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
