/**
 * Ticket Update Form — Client Component
 *
 * Allows clients to add updates/comments to an open Care ticket.
 */

'use client'

import { useActionState, useRef, useEffect } from 'react'
import { addCareTicketUpdate, type CareActionState } from '@/lib/actions/care'

export function TicketUpdateForm({ ticketId }: { ticketId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    addCareTicketUpdate,
    null
  )

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div>
      <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Add Update
      </h2>

      {state?.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-3">
          {state.error}
        </div>
      )}

      <form ref={formRef} action={formAction} className="glass glass--card p-4 space-y-4">
        <input type="hidden" name="ticketId" value={ticketId} />

        <textarea
          name="content"
          required
          maxLength={5000}
          rows={3}
          placeholder="Add a comment or question..."
          className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Sending...' : 'Send Update'}
          </button>
        </div>
      </form>
    </div>
  )
}
