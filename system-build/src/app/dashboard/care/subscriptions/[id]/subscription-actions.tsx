/**
 * Subscription Actions — Pause, resume, cancel a Care subscription.
 */

'use client'

import { useActionState } from 'react'
import { updateCareSubscription, type CareActionState } from '@/lib/actions/care'

export function SubscriptionActions({
  subscriptionId,
  status,
}: {
  subscriptionId: string
  status: string
}) {
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    updateCareSubscription,
    null
  )

  return (
    <div className="glass glass--card p-4">
      <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-3">
        Subscription Actions
      </p>

      {state?.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-3">
          {state.error}
        </div>
      )}

      {state?.success && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 mb-3">
          Subscription updated
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {status === 'ACTIVE' && (
          <>
            <form action={formAction}>
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <input type="hidden" name="action" value="pause" />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-amber-600 text-white text-xs font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                Pause
              </button>
            </form>
            <form action={formAction}>
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <input type="hidden" name="action" value="cancel" />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </form>
          </>
        )}

        {status === 'PAUSED' && (
          <>
            <form action={formAction}>
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <input type="hidden" name="action" value="resume" />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                Resume
              </button>
            </form>
            <form action={formAction}>
              <input type="hidden" name="subscriptionId" value={subscriptionId} />
              <input type="hidden" name="action" value="cancel" />
              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </form>
          </>
        )}

        {(status === 'CANCELLED' || status === 'PAST_DUE') && (
          <p className="text-xs text-[var(--text-subtle)]">
            This subscription is {status.toLowerCase().replace('_', ' ')}. No actions available.
          </p>
        )}
      </div>
    </div>
  )
}
