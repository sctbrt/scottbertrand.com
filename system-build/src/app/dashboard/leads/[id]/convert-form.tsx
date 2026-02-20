'use client'

// Convert Lead to Client Form
import { useActionState } from 'react'
import { convertToClient } from '@/lib/actions/leads'
import { Spinner } from '@/components/ui/spinner'

interface TemplateScope {
  tier?: 'build' | 'transform' | 'care'
  [key: string]: unknown
}

const TIER_GROUPS: { tier: string; label: string }[] = [
  { tier: 'build', label: 'Build (Amber)' },
  { tier: 'transform', label: 'Transform (Violet)' },
  { tier: 'care', label: 'Care (Blue)' },
]

interface ConvertToClientFormProps {
  lead: {
    id: string
    email: string
    name: string | null
    companyName: string | null
    phone: string | null
    website: string | null
  }
  templates: {
    id: string
    name: string
    slug: string
    scope: unknown
  }[]
}

export function ConvertToClientForm({ lead, templates }: ConvertToClientFormProps) {
  const action = convertToClient.bind(null, lead.id)
  const [state, formAction, isPending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm text-[var(--text-muted)]">
        Create a client account for{' '}
        <strong>{lead.name || lead.email}</strong>. They will receive portal
        access via magic link at their email address.
      </p>

      <div>
        <label
          htmlFor="contactName"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Contact Name *
        </label>
        <input
          type="text"
          id="contactName"
          name="contactName"
          required
          defaultValue={lead.name || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="companyName"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Company Name
        </label>
        <input
          type="text"
          id="companyName"
          name="companyName"
          defaultValue={lead.companyName || ''}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <input
            type="checkbox"
            name="createProject"
            value="true"
            defaultChecked
            className="rounded border-[var(--border)]"
          />
          Create an initial project
        </label>
      </div>

      <div>
        <label
          htmlFor="projectName"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Project Name
        </label>
        <input
          type="text"
          id="projectName"
          name="projectName"
          defaultValue={lead.companyName ? `${lead.companyName} Website` : 'New Project'}
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
        />
      </div>

      <div>
        <label
          htmlFor="templateId"
          className="block text-sm font-medium text-[var(--text)] mb-1"
        >
          Service Template
        </label>
        <select
          id="templateId"
          name="templateId"
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-sm"
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

      {state?.error && (
        <div className="p-3 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg">
          <p className="text-sm text-[var(--error-text)]">{state.error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        {isPending ? 'Converting...' : 'Convert to Client'}
      </button>
    </form>
  )
}
