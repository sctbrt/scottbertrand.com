/**
 * Status Update Form — Admin moves a triaged ticket through its lifecycle.
 */

'use client'

import { useActionState } from 'react'
import { updateCareTicketStatus, type CareActionState } from '@/lib/actions/care'

const transitions: Record<string, { label: string; value: string; color: string }[]> = {
  TRIAGED: [
    { label: 'Start Work', value: 'IN_PROGRESS', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Cancel', value: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  IN_PROGRESS: [
    { label: 'Send for Review', value: 'IN_REVIEW', color: 'bg-violet-600 hover:bg-violet-700' },
    { label: 'Mark Complete', value: 'COMPLETED', color: 'bg-sky-600 hover:bg-sky-700' },
    { label: 'Cancel', value: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
  IN_REVIEW: [
    { label: 'Mark Complete', value: 'COMPLETED', color: 'bg-sky-600 hover:bg-sky-700' },
    { label: 'Back to In Progress', value: 'IN_PROGRESS', color: 'bg-emerald-600 hover:bg-emerald-700' },
    { label: 'Cancel', value: 'CANCELLED', color: 'bg-rose-600 hover:bg-rose-700' },
  ],
}

export function StatusUpdateForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string
  currentStatus: string
}) {
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    updateCareTicketStatus,
    null
  )

  const available = transitions[currentStatus]
  if (!available || available.length === 0) return null

  return (
    <div className="glass glass--card p-4">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Update Status
      </p>

      {state?.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-3">
          {state.error}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {available.map((transition) => (
          <form key={transition.value} action={formAction}>
            <input type="hidden" name="ticketId" value={ticketId} />
            <input type="hidden" name="status" value={transition.value} />
            <button
              type="submit"
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-50 ${transition.color}`}
            >
              {transition.label}
            </button>
          </form>
        ))}
      </div>
    </div>
  )
}
