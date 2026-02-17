/**
 * Dashboard — Care Ticket Detail
 *
 * Admin view of a Care ticket with triage controls, status management,
 * credit info, and full update thread (including internal notes).
 */

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getCareTicket } from '@/lib/data/care'
import { getBalanceSummary } from '@/lib/care-credits'
import Link from 'next/link'
import { TriageForm } from './triage-form'
import { StatusUpdateForm } from './status-update-form'
import { AdminUpdateForm } from './admin-update-form'

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
  TRIAGED: 'Triaged',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default async function DashboardTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') redirect('/login')

  const { id } = await params
  const ticket = await getCareTicket(id)

  if (!ticket) {
    notFound()
  }

  const balance = await getBalanceSummary(ticket.subscriptionId)
  const isOpen = !['COMPLETED', 'CANCELLED'].includes(ticket.status)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back Link */}
      <Link
        href="/dashboard/care"
        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors inline-block"
      >
        ← Care Overview
      </Link>

      {/* Ticket Header */}
      <div className="glass glass--card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold text-[var(--text)]">{ticket.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-[var(--text-muted)]">
                {ticket.subscription.client.contactName}
                {ticket.subscription.client.companyName && ` · ${ticket.subscription.client.companyName}`}
              </span>
              <span className="text-xs text-[var(--text-subtle)]">
                {ticket.subscription.plan} plan
              </span>
            </div>
          </div>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColors[ticket.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
          >
            {statusLabels[ticket.status] || ticket.status}
          </span>
        </div>

        <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed mb-4">
          {ticket.description}
        </p>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-[var(--border)] text-xs text-[var(--text-subtle)]">
          <span>Submitted {ticket.submittedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          {ticket.triagedAt && <span>Triaged {ticket.triagedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>}
          {ticket.startedAt && <span>Started {ticket.startedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>}
          {ticket.completedAt && <span className="text-emerald-400">Completed {ticket.completedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}</span>}
          {ticket.creditsCharged > 0 && <span>{ticket.creditsCharged} credit{ticket.creditsCharged !== 1 ? 's' : ''} ({ticket.creditSize})</span>}
          {ticket.priority !== 'NORMAL' && <span className="text-amber-400 uppercase">{ticket.priority}</span>}
        </div>

        {/* Internal Notes */}
        {ticket.internalNotes && (
          <div className="mt-4 p-3 rounded-lg bg-violet-500/5 border border-violet-500/10">
            <p className="text-xs text-violet-400 uppercase tracking-wider mb-1 font-medium">Internal Notes</p>
            <p className="text-sm text-[var(--text-muted)]">{ticket.internalNotes}</p>
          </div>
        )}
      </div>

      {/* Credit Balance Sidebar */}
      <div className="glass glass--card p-4">
        <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider mb-2">Client Credit Balance</p>
        <div className="flex items-center gap-6">
          <div>
            <span className="text-lg font-semibold text-[var(--text)]">{balance.availableCredits}</span>
            <span className="text-xs text-[var(--text-subtle)] ml-1">available</span>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">{balance.creditsPerMonth}</span>
            <span className="text-xs text-[var(--text-subtle)] ml-1">/ month</span>
          </div>
          <div>
            <span className="text-sm text-[var(--text-muted)]">{balance.ledgerBalance}</span>
            <span className="text-xs text-[var(--text-subtle)] ml-1">ledger total</span>
          </div>
        </div>
      </div>

      {/* Triage Form (only for SUBMITTED tickets) */}
      {ticket.status === 'SUBMITTED' && (
        <TriageForm ticketId={ticket.id} availableCredits={balance.availableCredits} />
      )}

      {/* Status Update (for triaged/in-progress tickets) */}
      {['TRIAGED', 'IN_PROGRESS', 'IN_REVIEW'].includes(ticket.status) && (
        <StatusUpdateForm ticketId={ticket.id} currentStatus={ticket.status} />
      )}

      {/* Updates Thread */}
      {ticket.updates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Updates ({ticket.updates.length})
          </h2>
          {ticket.updates.map((update) => (
            <div
              key={update.id}
              className={`glass glass--card p-4 ${update.isInternal ? 'border-violet-500/20 bg-violet-500/5' : ''}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[var(--text)]">
                  {update.author.name || update.author.email}
                </span>
                {update.author.role === 'INTERNAL_ADMIN' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">Admin</span>
                )}
                {update.isInternal && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">Internal</span>
                )}
                <span className="text-xs text-[var(--text-subtle)]">
                  {update.createdAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                  {' · '}
                  {update.createdAt.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                {update.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Admin Update Form */}
      {isOpen && (
        <AdminUpdateForm ticketId={ticket.id} />
      )}

      {/* Credit Ledger for this ticket */}
      {ticket.ledgerEntries.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Credit Activity
          </h2>
          <div className="glass glass--card divide-y divide-[var(--border)]">
            {ticket.ledgerEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 text-xs">
                <div>
                  <span className={entry.delta > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                    {entry.delta > 0 ? '+' : ''}{entry.delta}
                  </span>
                  <span className="text-[var(--text-subtle)] ml-2">{entry.type}</span>
                  {entry.reason && <span className="text-[var(--text-subtle)] ml-2">— {entry.reason}</span>}
                </div>
                <span className="text-[var(--text-subtle)]">
                  {entry.createdAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
