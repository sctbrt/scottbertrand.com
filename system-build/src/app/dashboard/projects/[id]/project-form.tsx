'use client'

// Project Form Component for Create/Edit
import { useActionState } from 'react'
import { createProject, updateProject } from '@/lib/actions/projects'

interface TemplateScope {
  tier?: 'build' | 'transform' | 'care'
  [key: string]: unknown
}

const TIER_GROUPS: { tier: string; label: string }[] = [
  { tier: 'build', label: 'Build (Amber)' },
  { tier: 'transform', label: 'Transform (Violet)' },
  { tier: 'care', label: 'Care (Blue)' },
]

interface ProjectFormProps {
  project?: {
    id: string
    name: string
    description: string | null
    status: string
    clientId: string
    serviceTemplateId: string | null
    startDate: Date | null
    targetEndDate: Date | null
    previewUrl: string | null
  }
  clients: {
    id: string
    companyName: string | null
    contactName: string
  }[]
  templates: {
    id: string
    name: string
    slug: string
    scope: unknown
  }[]
  compact?: boolean
}

export function ProjectForm({ project, clients, templates, compact }: ProjectFormProps) {
  const action = project ? updateProject.bind(null, project.id) : createProject
  const [state, formAction, isPending] = useActionState(action, null)

  const statuses = [
    'DRAFT',
    'PENDING_APPROVAL',
    'IN_PROGRESS',
    'ON_HOLD',
    'COMPLETED',
    'CANCELLED',
  ]

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Project Name *
        </label>
        <input
          type="text"
          id="name"
          name="name"
          required
          defaultValue={project?.name || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
      </div>

      <div>
        <label
          htmlFor="clientId"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Client *
        </label>
        <select
          id="clientId"
          name="clientId"
          required
          defaultValue={project?.clientId || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">Select a client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.companyName || client.contactName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="serviceTemplateId"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Service Template
        </label>
        <select
          id="serviceTemplateId"
          name="serviceTemplateId"
          defaultValue={project?.serviceTemplateId || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          <option value="">Custom Project</option>
          {TIER_GROUPS.map(({ tier, label }) => {
            const grouped = templates.filter(t => {
              const s = t.scope as TemplateScope | null
              return s && typeof s === 'object' && !Array.isArray(s) && s.tier === tier
            })
            if (grouped.length === 0) return null
            return (
              <optgroup key={tier} label={label}>
                {grouped.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </optgroup>
            )
          })}
          {/* Ungrouped templates */}
          {templates.filter(t => {
            const s = t.scope as TemplateScope | null
            return !s || typeof s !== 'object' || Array.isArray(s) || !s.tier
          }).map((template) => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
      </div>

      {project && (
        <div>
          <label
            htmlFor="status"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={project.status}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>
      )}

      {!compact && (
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            defaultValue={project?.description || ''}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none"
          />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="startDate"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Start Date
          </label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            defaultValue={project?.startDate ? formatDateInput(project.startDate) : ''}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
        <div>
          <label
            htmlFor="targetEndDate"
            className="block text-sm font-medium text-[var(--text)] mb-1"
          >
            Target End Date
          </label>
          <input
            type="date"
            id="targetEndDate"
            name="targetEndDate"
            defaultValue={project?.targetEndDate ? formatDateInput(project.targetEndDate) : ''}
            className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="previewUrl"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Preview URL
        </label>
        <input
          type="url"
          id="previewUrl"
          name="previewUrl"
          placeholder="https://preview.vercel.app/..."
          defaultValue={project?.previewUrl || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        />
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Visible to client in their portal
        </p>
      </div>

      {state?.error && (
        <div className="p-3 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg">
          <p className="text-sm text-[var(--error-text)]">{state.error}</p>
        </div>
      )}

      {state?.success && (
        <div className="p-3 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg">
          <p className="text-sm text-[var(--success-text)]">
            {project ? 'Project updated successfully' : 'Project created successfully'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : project ? 'Update Project' : 'Create Project'}
      </button>
    </form>
  )
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}
