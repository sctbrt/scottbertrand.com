/**
 * Client Portal — Care Ticket Detail
 *
 * Shows a single ticket with its description, status, and update thread.
 * Internal notes from admins are hidden from clients.
 */

import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { getClientTicketDetail } from '@/lib/data/care'
import Link from 'next/link'
import { TicketUpdateForm } from './ticket-update-form'

const statusColors: Record<string, string> = {
  SUBMITTED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  TRIAGED: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  IN_REVIEW: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  COMPLETED: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  CANCELLED: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
}

const statusLabels: Record<string, string> = {
  SUBMITTED: 'Submitted — Awaiting Review',
  TRIAGED: 'Accepted — Queued',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review — Your Feedback Needed',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export default async function CareTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/login')

  const { id } = await params
  const ticket = await getClientTicketDetail(session.user.id!, id)

  if (!ticket) {
    notFound()
  }

  const isOpen = !['COMPLETED', 'CANCELLED'].includes(ticket.status)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Back Link */}
      <Link
        href="/portal/care/tickets"
        className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors inline-block"
      >
        ← All Requests
      </Link>

      {/* Ticket Header */}
      <div className="glass glass--card p-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <h1 className="text-xl font-semibold text-[var(--text)]">{ticket.title}</h1>
          <span
            className={`text-xs px-2.5 py-1 rounded-full border whitespace-nowrap flex-shrink-0 ${statusColors[ticket.status] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}
          >
            {statusLabels[ticket.status] || ticket.status}
          </span>
        </div>

        <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap leading-relaxed">
          {ticket.description}
        </p>

        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
          <span className="text-xs text-[var(--text-subtle)]">
            Submitted {ticket.submittedAt.toLocaleDateString('en-CA', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          {ticket.creditsCharged > 0 && (
            <span className="text-xs text-[var(--text-subtle)]">
              {ticket.creditsCharged} credit{ticket.creditsCharged !== 1 ? 's' : ''} charged
            </span>
          )}
          {ticket.completedAt && (
            <span className="text-xs text-emerald-400">
              Completed {ticket.completedAt.toLocaleDateString('en-CA', {
                month: 'short',
                day: 'numeric',
              })}
            </span>
          )}
        </div>
      </div>

      {/* Updates Thread */}
      {ticket.updates.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider">
            Updates
          </h2>
          {ticket.updates.map((update) => (
            <div key={update.id} className="glass glass--card p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-[var(--text)]">
                  {update.author.name || 'Team'}
                </span>
                {update.author.role === 'INTERNAL_ADMIN' && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400">
                    Team
                  </span>
                )}
                <span className="text-xs text-[var(--text-subtle)]">
                  {update.createdAt.toLocaleDateString('en-CA', {
                    month: 'short',
                    day: 'numeric',
                  })}
                  {' · '}
                  {update.createdAt.toLocaleTimeString('en-CA', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="text-sm text-[var(--text-muted)] whitespace-pre-wrap">
                {update.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Add Update Form (only if ticket is open) */}
      {isOpen && (
        <TicketUpdateForm ticketId={ticket.id} />
      )}
    </div>
  )
}
