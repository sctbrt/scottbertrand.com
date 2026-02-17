/**
 * Client Portal — Submit Care Request
 *
 * Form for clients to submit a new Care ticket/work request.
 */

'use client'

import { useActionState } from 'react'
import { submitCareTicket, type CareActionState } from '@/lib/actions/care'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function CareRequestPage() {
  const router = useRouter()
  const [state, formAction, isPending] = useActionState<CareActionState, FormData>(
    submitCareTicket,
    null
  )

  useEffect(() => {
    if (state?.success) {
      router.push('/portal/care')
    }
  }, [state, router])

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/portal/care"
          className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2 inline-block"
        >
          ← Back to Care
        </Link>
        <h1 className="text-2xl font-semibold text-[var(--text)]">New Request</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Describe what you need and we&apos;ll take care of it.
        </p>
      </div>

      {/* Error Message */}
      {state?.error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-400">
          {state.error}
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="glass glass--card p-6 space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-[var(--text)] mb-2">
            What do you need?
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={200}
            placeholder="e.g., Update the homepage hero text"
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors"
          />
          <p className="text-xs text-[var(--text-subtle)] mt-1">Short summary (200 chars max)</p>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-[var(--text)] mb-2">
            Details
          </label>
          <textarea
            id="description"
            name="description"
            required
            maxLength={5000}
            rows={6}
            placeholder="Describe the change you need. Include specific text, URLs, or references if helpful."
            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-[var(--border)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] transition-colors resize-y"
          />
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            Be as specific as possible. We&apos;ll size the work and deduct credits when we accept it.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/portal/care"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="px-6 py-2.5 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPending ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>

      {/* Credit Info */}
      <div className="p-4 rounded-lg bg-sky-500/5 border border-sky-500/10">
        <p className="text-xs text-[var(--text-muted)]">
          <strong className="text-[var(--text)]">How credit sizing works:</strong> We review each request and assign a credit size based on scope.
          Credits are deducted when we accept the request, not when you submit it.
          If a request is outside your plan scope, we&apos;ll let you know and provide a Build quote instead.
        </p>
      </div>
    </div>
  )
}
