/**
 * Client Portal — Care Tickets List
 *
 * Shows all of the client's Care requests with status and credit info.
 */

import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getClientTickets } from '@/lib/data/care'
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
  TRIAGED: 'Accepted',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default async function CareTicketsPage() {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { tickets, total } = await getClientTickets(session.user.id!)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/portal/care"
            className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors mb-2 inline-block"
          >
            ← Back to Care
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">All Requests</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            {total} request{total !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link
          href="/portal/care/request"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + New Request
        </Link>
      </div>

      {/* Tickets List */}
      {tickets.length === 0 ? (
        <div className="glass glass--card p-16 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-lg font-medium text-[var(--text)] mb-2">No requests yet</h2>
          <p className="text-sm text-[var(--text-muted)]">
            <Link href="/portal/care/request" className="text-[var(--accent)] hover:underline">
              Submit your first request
            </Link>{' '}
            to get started.
          </p>
        </div>
      ) : (
        <div className="glass glass--card divide-y divide-[var(--border)]">
          {tickets.map((ticket) => (
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
                    {ticket.submittedAt.toLocaleDateString('en-CA', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>
                  {ticket.creditsCharged > 0 && (
                    <span className="text-xs text-[var(--text-subtle)]">
                      {ticket.creditsCharged} credit{ticket.creditsCharged !== 1 ? 's' : ''}
                    </span>
                  )}
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
  )
}
