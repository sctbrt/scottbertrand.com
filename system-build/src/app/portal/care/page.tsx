/**
 * Client Portal — Care Home
 *
 * Shows the client's Care subscription overview:
 * credit balance, plan info, recent tickets, and quick actions.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClientCareHome } from '@/lib/data/care'
import Link from 'next/link'

// Status badge colors matching dashboard conventions
const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  TRIAGED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  IN_REVIEW: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  COMPLETED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted',
  TRIAGED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

const sizeLabels: Record<string, string> = {
  MICRO: 'Micro (1 credit)',
  STANDARD: 'Standard (2 credits)',
  ADVANCED: 'Advanced (4 credits)',
}

export default async function CareHomePage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const careData = await getClientCareHome(session.user.id!)

  if (!careData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Care</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">Monthly support plan</p>
        </div>
        <div className="glass glass--card p-16 text-center">
          <div className="text-4xl mb-4">🛡️</div>
          <h2 className="text-lg font-medium text-[var(--text)] mb-2">No active Care plan</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md mx-auto">
            Care plans provide ongoing monthly support for your brand and website.
            Contact us to learn about our Care options.
          </p>
        </div>
      </div>
    )
  }

  const { subscription, balance, recentTickets, activeLots } = careData

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">Care</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {subscription.plan} plan · Monthly support
          </p>
        </div>
        <Link
          href="/portal/care/request"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Request
        </Link>
      </div>

      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Credits */}
        <div className="glass glass--card p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Available Credits
          </p>
          <p className="text-3xl font-semibold text-[var(--text)]">
            {balance.availableCredits}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            of {balance.creditsPerMonth} / month
          </p>
        </div>

        {/* Plan */}
        <div className="glass glass--card p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Plan
          </p>
          <p className="text-lg font-medium text-[var(--text)]">
            {subscription.plan === 'ESSENTIALS' && 'Bronze'}
            {subscription.plan === 'GROWTH' && 'Silver'}
            {subscription.plan === 'PARTNER' && 'Gold'}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {balance.creditsPerMonth} credits / month
          </p>
        </div>

        {/* Period */}
        <div className="glass glass--card p-6">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-1">
            Current Period
          </p>
          <p className="text-sm font-medium text-[var(--text)]">
            {subscription.currentPeriodStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
            {' — '}
            {subscription.currentPeriodEnd.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            Renews {subscription.currentPeriodEnd.toLocaleDateString('en-CA', { month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Credit Usage Bar */}
      {balance.creditsPerMonth > 0 && (
        <div className="glass glass--card p-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[var(--text)]">Credit Usage</p>
            <p className="text-xs text-[var(--text-muted)]">
              {balance.creditsPerMonth - balance.availableCredits} of {balance.creditsPerMonth} used this period
            </p>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
              style={{
                width: `${Math.min(100, ((balance.creditsPerMonth - balance.availableCredits) / balance.creditsPerMonth) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Recent Tickets */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-[var(--text)]">Recent Requests</h2>
          <Link
            href="/portal/care/tickets"
            className="text-xs text-[var(--accent)] hover:underline"
          >
            View all →
          </Link>
        </div>

        {recentTickets.length === 0 ? (
          <div className="glass glass--card p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">
              No requests yet.{' '}
              <Link href="/portal/care/request" className="text-[var(--accent)] hover:underline">
                Submit your first request
              </Link>
            </p>
          </div>
        ) : (
          <div className="glass glass--card divide-y divide-[var(--border)]">
            {recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/portal/care/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 hover:bg-[var(--accent-subtle)] transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                    {ticket.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-subtle)]">
                      {ticket.submittedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </span>
                    {ticket.creditSize && (
                      <span className="text-xs text-[var(--text-subtle)]">
                        {sizeLabels[ticket.creditSize] || ticket.creditSize}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${statusColors[ticket.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* How Credits Work */}
      <div className="glass glass--card p-6">
        <h3 className="text-sm font-medium text-[var(--text)] mb-3">How Credits Work</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
          <div>
            <p className="font-medium text-[var(--text)] mb-1">Micro · 1 credit</p>
            <p>Text swaps, image swaps, link fixes, metadata tweaks, small CSS changes.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)] mb-1">Standard · 2 credits</p>
            <p>New sections, landing page iterations, form changes, embed swaps.</p>
          </div>
          <div>
            <p className="font-medium text-[var(--text)] mb-1">Advanced · 4 credits</p>
            <p>New pages, layout work, performance sweeps, structured CRO passes.</p>
          </div>
        </div>
      </div>
    </div>
  )
}
