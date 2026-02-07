// Dashboard - Invoices Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ClientFilterSelect } from './client-filter-select'
import type { InvoiceStatus } from '@prisma/client'

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; clientId?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status || undefined
  const clientId = params.clientId || undefined
  const page = parseInt(params.page || '1')
  const perPage = 20

  // Build filter
  const where: { status?: InvoiceStatus; clientId?: string } = {}
  if (status) where.status = status as InvoiceStatus
  if (clientId) where.clientId = clientId

  // Fetch invoices with pagination
  const [invoices, totalCount, clients, totals] = await Promise.all([
    prisma.invoices.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        clients: {
          select: { companyName: true, contactName: true },
        },
        projects: {
          select: { name: true },
        },
      },
    }),
    prisma.invoices.count({ where }),
    // Get all clients for filter dropdown
    prisma.clients.findMany({
      select: { id: true, companyName: true, contactName: true },
      orderBy: { companyName: 'asc' },
    }),
    // Get totals by status (filtered by client if selected)
    prisma.invoices.groupBy({
      by: ['status'],
      ...(clientId ? { where: { clientId } } : {}),
      _sum: { total: true },
      _count: { id: true },
    }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  // Process totals
  const statusTotals = totals.reduce((acc, curr) => {
    acc[curr.status] = {
      count: curr._count.id,
      amount: Number(curr._sum.total) || 0,
    }
    return acc
  }, {} as Record<string, { count: number; amount: number }>)

  const totalOutstanding =
    (statusTotals['SENT']?.amount || 0) +
    (statusTotals['VIEWED']?.amount || 0) +
    (statusTotals['OVERDUE']?.amount || 0)

  const totalPaid = statusTotals['PAID']?.amount || 0

  const statuses = ['DRAFT', 'SENT', 'VIEWED', 'PAID', 'OVERDUE', 'CANCELLED']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Invoices
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage client invoices and payments
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors"
        >
          New Invoice
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Outstanding</p>
          <p className="text-2xl font-semibold text-orange-500 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {(statusTotals['SENT']?.count || 0) +
              (statusTotals['VIEWED']?.count || 0) +
              (statusTotals['OVERDUE']?.count || 0)}{' '}
            unpaid invoices
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Paid</p>
          <p className="text-2xl font-semibold text-[var(--success-text)] mt-1">
            {formatCurrency(totalPaid)}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {statusTotals['PAID']?.count || 0} paid invoices
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Overdue</p>
          <p className="text-2xl font-semibold text-[var(--error-text)] mt-1">
            {formatCurrency(statusTotals['OVERDUE']?.amount || 0)}
          </p>
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {statusTotals['OVERDUE']?.count || 0} overdue invoices
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Status Filters */}
        <div className="flex gap-2 flex-wrap flex-1">
          <FilterChip
            label={`All (${totalCount})`}
            href={buildFilterUrl(undefined, clientId)}
            active={!status}
          />
          {statuses.map((s) => (
            <FilterChip
              key={s}
              label={`${s} (${statusTotals[s]?.count || 0})`}
              href={buildFilterUrl(s, clientId)}
              active={status === s}
            />
          ))}
        </div>

        {/* Client Filter */}
        <div>
          <ClientFilterSelect
            clients={clients}
            currentClientId={clientId}
            currentStatus={status}
          />
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Invoice
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Client
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Project
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Due Date
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No invoices found
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-[var(--accent-subtle)]">
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/invoices/${invoice.id}`}
                      className="text-sm font-medium text-[var(--text)] hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {formatDate(invoice.createdAt)}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/dashboard/clients/${invoice.clientId}`}
                      className="text-sm text-[var(--text)] hover:underline"
                    >
                      {invoice.clients.companyName || invoice.clients.contactName}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text)]">
                    {invoice.projects ? (
                      <Link
                        href={`/dashboard/projects/${invoice.projectId}`}
                        className="hover:underline"
                      >
                        {invoice.projects.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                    {invoice.dueDate ? (
                      <span className={isOverdue(invoice.dueDate, invoice.status) ? 'text-[var(--error-text)] font-medium' : ''}>
                        {formatDate(invoice.dueDate)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <p className="text-sm font-medium text-[var(--text)]">
                      {formatCurrency(Number(invoice.total))}
                    </p>
                    {invoice.status === 'PAID' && invoice.paidAt && (
                      <p className="text-xs text-[var(--success-text)]">
                        Paid {formatDate(invoice.paidAt)}
                      </p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} invoices
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/invoices?page=${page - 1}${status ? `&status=${status}` : ''}${clientId ? `&clientId=${clientId}` : ''}`}
                className="px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded hover:bg-[var(--accent-subtle)]"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/invoices?page=${page + 1}${status ? `&status=${status}` : ''}${clientId ? `&clientId=${clientId}` : ''}`}
                className="px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded hover:bg-[var(--accent-subtle)]"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function buildFilterUrl(status?: string, clientId?: string) {
  const params = new URLSearchParams()
  if (status) params.set('status', status)
  if (clientId) params.set('clientId', clientId)
  const query = params.toString()
  return `/dashboard/invoices${query ? `?${query}` : ''}`
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 text-sm rounded-full transition-colors whitespace-nowrap ${
        active
          ? 'bg-[var(--text)] text-[var(--bg)]'
          : 'bg-[var(--surface-2)] text-[var(--text-muted)] hover:bg-[var(--accent-subtle)]'
      }`}
    >
      {label}
    </Link>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    SENT: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    VIEWED: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    PAID: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    OVERDUE: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    CANCELLED: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  }
  return colors[status] || colors.DRAFT
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function isOverdue(dueDate: Date, status: string): boolean {
  if (status === 'PAID' || status === 'CANCELLED' || status === 'DRAFT') {
    return false
  }
  return new Date() > new Date(dueDate)
}
