/**
 * Admin Update Form — Admin posts updates (public or internal) on a Care ticket.
 */

'use client'

import { useActionState, useRef, useEffect, useState } from 'react'
import { addCareTicketUpdate, type CareActionState } from '@/lib/actions/care'

export function AdminUpdateForm({ ticketId }: { ticketId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [isInternal, setIsInternal] = useState(false)
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    addCareTicketUpdate,
    null
  )

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
      setIsInternal(false)
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
        <input type="hidden" name="isInternal" value={isInternal ? 'true' : 'false'} />

        <textarea
          name="content"
          required
          maxLength={5000}
          rows={3}
          placeholder={isInternal ? 'Internal note (admin-only)...' : 'Update visible to client...'}
          className={`w-full px-3 py-2 rounded-lg bg-white/5 border text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y ${
            isInternal ? 'border-violet-500/30' : 'border-[var(--border)]'
          }`}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isInternal}
              onChange={(e) => setIsInternal(e.target.checked)}
              className="accent-violet-500"
            />
            <span className="text-xs text-[var(--text-muted)]">
              Internal note (admin-only, hidden from client)
            </span>
          </label>

          <button
            type="submit"
            disabled={isPending}
            className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition-all disabled:opacity-50 ${
              isInternal ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[var(--accent)] hover:opacity-90'
            }`}
          >
            {isPending ? 'Sending...' : isInternal ? 'Save Internal Note' : 'Send Update'}
          </button>
        </div>
      </form>
    </div>
  )
}
