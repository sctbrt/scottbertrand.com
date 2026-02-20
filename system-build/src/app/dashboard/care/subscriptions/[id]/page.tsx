/**
 * Dashboard — Care Subscription Detail
 *
 * Shows subscription details, credit balance, credit lots,
 * ledger history, and management actions.
 */

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCareSubscription, getCreditLedger } from '@/lib/data/care'
import Link from 'next/link'
import { SubscriptionActions } from './subscription-actions'
import { CreditAdjustmentForm } from './credit-adjustment-form'

const planLabels: Record<string, string> = {
  ESSENTIALS: 'Bronze',
  GROWTH: 'Silver',
  PARTNER: 'Gold',
}

const subStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PAUSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  PAST_DUE: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const ledgerTypeColors: Record<string, string> = {
  ALLOCATION: 'text-emerald-400',
  SPEND: 'text-rose-400',
  EXPIRY: 'text-amber-400',
  ADJUSTMENT: 'text-sky-400',
}

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') redirect('/login')

  const { id } = await params
  const subscription = await getCareSubscription(id)

  if (!subscription) {
    notFound()
  }

  const ledger = await getCreditLedger(id, 50)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/dashboard/care"
        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors inline-block"
      >
        ← Care Overview
      </Link>

      {/* Header */}
      <div className="glass glass--card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">
              {subscription.client.contactName}
            </h1>
            {subscription.client.companyName && (
              <p className="text-sm text-[var(--text-muted)]">{subscription.client.companyName}</p>
            )}
            <p className="text-xs text-[var(--text-subtle)] mt-1">{subscription.client.contactEmail}</p>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border ${subStatusColors[subscription.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
          >
            {subscription.status}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-[var(--border)]">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Plan</p>
            <p className="text-sm font-medium text-[var(--text)] mt-1">{planLabels[subscription.plan]}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Credits / Month</p>
            <p className="text-sm font-medium text-[var(--text)] mt-1">{subscription.creditsPerMonth}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Available Now</p>
            <p className="text-sm font-medium text-[var(--text)] mt-1">{subscription.balance.availableCredits}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Ledger Balance</p>
            <p className="text-sm font-medium text-[var(--text)] mt-1">{subscription.balance.ledgerBalance}</p>
          </div>
        </div>

        {/* Period Info */}
        <div className="mt-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-subtle)]">
          <span>
            Current period: {subscription.currentPeriodStart.toLocaleDateString('en-CA')} — {subscription.currentPeriodEnd.toLocaleDateString('en-CA')}
          </span>
          {subscription.stripeSubscriptionId && (
            <span className="ml-4">Stripe: {subscription.stripeSubscriptionId}</span>
          )}
          <span className="ml-4">Created: {subscription.createdAt.toLocaleDateString('en-CA')}</span>
        </div>
      </div>

      {/* Actions */}
      <SubscriptionActions subscriptionId={subscription.id} status={subscription.status} />

      {/* Credit Adjustment */}
      <CreditAdjustmentForm subscriptionId={subscription.id} />

      {/* Active Lots */}
      {subscription.activeLots.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Active Credit Lots
          </h2>
          <div className="glass glass--card divide-y divide-[var(--border)]">
            {subscription.activeLots.map((lot) => (
              <div key={lot.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-4">
                  <span className="text-[var(--text)]">
                    {lot.remaining} / {lot.allocated} remaining
                  </span>
                  <span className="text-[var(--text-subtle)]">
                    Period: {lot.periodStart.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <span className="text-[var(--text-subtle)]">
                  Expires {lot.expiresAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Credit Ledger */}
      {ledger.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Credit Ledger
          </h2>
          <div className="glass glass--card divide-y divide-[var(--border)]">
            {ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className={`font-mono font-medium ${ledgerTypeColors[entry.type] || 'text-[var(--text)]'}`}>
                    {entry.delta > 0 ? '+' : ''}{entry.delta}
                  </span>
                  <span className="text-[var(--text-muted)] uppercase text-[10px]">{entry.type}</span>
                  {entry.reason && (
                    <span className="text-[var(--text-subtle)] truncate max-w-[300px]">{entry.reason}</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {entry.ticket && (
                    <Link
                      href={`/dashboard/care/tickets/${entry.ticket.id}`}
                      className="text-[var(--accent)] hover:underline truncate max-w-[150px]"
                    >
                      {entry.ticket.title}
                    </Link>
                  )}
                  {entry.actor && (
                    <span className="text-[var(--text-subtle)]">{entry.actor.name}</span>
                  )}
                  <span className="text-[var(--text-subtle)] whitespace-nowrap">
                    {entry.createdAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
