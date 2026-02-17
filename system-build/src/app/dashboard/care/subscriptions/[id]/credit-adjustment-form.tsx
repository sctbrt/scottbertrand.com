/**
 * Credit Adjustment Form — Admin manually adjusts credits on a subscription.
 */

'use client'

import { useActionState, useRef, useEffect } from 'react'
import { adminCreditAdjustment, type CareActionState } from '@/lib/actions/care'

export function CreditAdjustmentForm({
  subscriptionId,
}: {
  subscriptionId: string
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    adminCreditAdjustment,
    null
  )

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="glass glass--card p-4">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Manual Credit Adjustment
      </p>

      {state?.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-3">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mb-3">
          Credits adjusted
        </div>
      )}

      <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="subscriptionId" value={subscriptionId} />

        <div className="flex-shrink-0">
          <label htmlFor="delta" className="block text-xs text-[var(--text-muted)] mb-1">
            Credits (+/-)
          </label>
          <input
            id="delta"
            name="delta"
            type="number"
            required
            min={-100}
            max={100}
            placeholder="0"
            className="w-24 px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm text-center focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <div className="flex-1 min-w-[200px]">
          <label htmlFor="reason" className="block text-xs text-[var(--text-muted)] mb-1">
            Reason (required)
          </label>
          <input
            id="reason"
            name="reason"
            type="text"
            required
            maxLength={500}
            placeholder="e.g., Goodwill credit for delayed response"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-medium hover:bg-sky-700 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {isPending ? 'Adjusting...' : 'Apply Adjustment'}
        </button>
      </form>
    </div>
  )
}
