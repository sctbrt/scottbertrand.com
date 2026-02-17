/**
 * Triage Form — Admin sizes and accepts a submitted Care ticket.
 */

'use client'

import { useActionState } from 'react'
import { triageCareTicket, type CareActionState } from '@/lib/actions/care'

const sizeOptions = [
  { value: 'MICRO', label: 'Micro', credits: 1, desc: 'Text swap, image swap, link fix, metadata tweak' },
  { value: 'STANDARD', label: 'Standard', credits: 2, desc: 'New section, landing page iteration, form changes' },
  { value: 'ADVANCED', label: 'Advanced', credits: 4, desc: 'New page, layout work, performance sweep, CRO pass' },
]

export function TriageForm({
  ticketId,
  availableCredits,
}: {
  ticketId: string
  availableCredits: number
}) {
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    triageCareTicket,
    null
  )

  return (
    <div className="glass glass--card p-6 border-amber-500/20">
      <h2 className="text-sm font-medium text-amber-400 uppercase tracking-wider mb-4">
        Triage Required
      </h2>

      {state?.error && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400 mb-4">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="ticketId" value={ticketId} />

        {/* Credit Size Selection */}
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Credit Size ({availableCredits} credits available)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {sizeOptions.map((opt) => (
              <label
                key={opt.value}
                className={`relative flex flex-col p-3 rounded-lg border cursor-pointer transition-all hover:border-[var(--accent)] ${
                  availableCredits < opt.credits
                    ? 'opacity-50 border-rose-500/20'
                    : 'border-[var(--border)]'
                }`}
              >
                <input
                  type="radio"
                  name="creditSize"
                  value={opt.value}
                  required
                  disabled={availableCredits < opt.credits}
                  className="absolute top-3 right-3 accent-[var(--accent)]"
                />
                <span className="text-sm font-medium text-[var(--text)]">
                  {opt.label}
                  <span className="text-xs text-[var(--text-muted)] ml-1">
                    ({opt.credits} credit{opt.credits !== 1 ? 's' : ''})
                  </span>
                </span>
                <span className="text-xs text-[var(--text-subtle)] mt-1">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Priority */}
        <div>
          <label htmlFor="priority" className="block text-sm font-medium text-[var(--text)] mb-2">
            Priority
          </label>
          <select
            id="priority"
            name="priority"
            defaultValue="NORMAL"
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
          >
            <option value="LOW">Low</option>
            <option value="NORMAL">Normal</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>

        {/* Internal Notes */}
        <div>
          <label htmlFor="internalNotes" className="block text-sm font-medium text-[var(--text)] mb-2">
            Internal Notes <span className="text-xs text-[var(--text-subtle)]">(optional, admin-only)</span>
          </label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            maxLength={2000}
            placeholder="Notes about scope, approach, etc."
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Triaging...' : 'Accept & Charge Credits'}
          </button>
        </div>
      </form>
    </div>
  )
}
