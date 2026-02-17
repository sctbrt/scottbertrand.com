/**
 * Dashboard — Care Overview
 *
 * Shows Care system stats, ticket queue, and subscription list.
 * Admin-only page for managing Care subscriptions and tickets.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getCareStats, getCareTicketQueue, getAllCareSubscriptions } from '@/lib/data/care'
import Link from 'next/link'

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

const priorityColors: Record<string, string> = {
  URGENT: 'text-rose-400',
  HIGH: 'text-amber-400',
  NORMAL: 'text-[var(--text-subtle)]',
  LOW: 'text-[var(--text-subtle)]',
}

const planLabels: Record<string, string> = {
  ESSENTIALS: 'Essentials',
  GROWTH: 'Growth',
  PARTNER: 'Partner',
}

const subStatusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  PAUSED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
  PAST_DUE: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

export default async function CareOverviewPage() {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') redirect('/login')

  const [stats, ticketQueue, subscriptions] = await Promise.all([
    getCareStats(),
    getCareTicketQueue({ status: ['SUBMITTED', 'TRIAGED', 'IN_PROGRESS', 'IN_REVIEW'], limit: 20 }),
    getAllCareSubscriptions(),
  ])

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text)]">Care</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Manage subscriptions, tickets, and credits</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass glass--stat p-4 hover:scale-[1.02] hover:border-[var(--accent)] transition-all cursor-default">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Active Plans</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">{stats.activeSubscriptions}</p>
        </div>
        <div className="glass glass--stat p-4 hover:scale-[1.02] hover:border-amber-500 transition-all cursor-default">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Awaiting Triage</p>
          <p className="text-2xl font-semibold text-amber-400 mt-1">{stats.submittedTickets}</p>
        </div>
        <div className="glass glass--stat p-4 hover:scale-[1.02] hover:border-emerald-500 transition-all cursor-default">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">In Progress</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">{stats.inProgressTickets}</p>
        </div>
        <div className="glass glass--stat p-4 hover:scale-[1.02] hover:border-sky-500 transition-all cursor-default">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Completed (Month)</p>
          <p className="text-2xl font-semibold text-sky-400 mt-1">{stats.completedThisMonth}</p>
        </div>
        <div className="glass glass--stat p-4 hover:scale-[1.02] transition-all cursor-default">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Total Plans</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">{stats.totalSubscriptions}</p>
        </div>
      </div>

      {/* Ticket Queue */}
      <div>
        <h2 className="text-lg font-medium text-[var(--text)] mb-4">
          Ticket Queue
          {stats.submittedTickets > 0 && (
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {stats.submittedTickets} new
            </span>
          )}
        </h2>

        {ticketQueue.tickets.length === 0 ? (
          <div className="glass glass--card p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">No active tickets in the queue.</p>
          </div>
        ) : (
          <div className="glass glass--card divide-y divide-[var(--border)]">
            {ticketQueue.tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/care/tickets/${ticket.id}`}
                className="flex items-center justify-between p-4 hover:bg-[var(--accent-subtle)] transition-colors group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[var(--text)] truncate group-hover:text-[var(--accent)] transition-colors">
                      {ticket.title}
                    </p>
                    {ticket.priority !== 'NORMAL' && (
                      <span className={`text-[10px] font-medium uppercase ${priorityColors[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--text-subtle)]">
                      {ticket.subscription.client.contactName}
                      {ticket.subscription.client.companyName && ` · ${ticket.subscription.client.companyName}`}
                    </span>
                    <span className="text-xs text-[var(--text-subtle)]">
                      {ticket.subscription.plan}
                    </span>
                    <span className="text-xs text-[var(--text-subtle)]">
                      {ticket.submittedAt.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                    </span>
                    {ticket._count.updates > 0 && (
                      <span className="text-xs text-[var(--text-subtle)]">
                        {ticket._count.updates} update{ticket._count.updates !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ml-4 ${statusColors[ticket.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
                >
                  {statusLabels[ticket.status] || ticket.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Subscriptions */}
      <div>
        <h2 className="text-lg font-medium text-[var(--text)] mb-4">Care Subscriptions</h2>

        {subscriptions.length === 0 ? (
          <div className="glass glass--card p-12 text-center">
            <p className="text-sm text-[var(--text-muted)]">No Care subscriptions yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subscriptions.map((sub) => (
              <Link
                key={sub.id}
                href={`/dashboard/care/subscriptions/${sub.id}`}
                className="glass glass--card p-5 hover:scale-[1.02] hover:border-[var(--accent)] transition-all group"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--accent)] transition-colors">
                    {sub.client.contactName}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${subStatusColors[sub.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
                  >
                    {sub.status}
                  </span>
                </div>
                {sub.client.companyName && (
                  <p className="text-xs text-[var(--text-muted)] mb-3">{sub.client.companyName}</p>
                )}
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[var(--text-muted)]">
                    {planLabels[sub.plan] || sub.plan} · {sub.creditsPerMonth} credits/mo
                  </span>
                  <span className="text-[var(--text)]">
                    {sub.balance.availableCredits} available
                  </span>
                </div>
                {sub._count.tickets > 0 && (
                  <p className="text-xs text-amber-400 mt-2">
                    {sub._count.tickets} active ticket{sub._count.tickets !== 1 ? 's' : ''}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
