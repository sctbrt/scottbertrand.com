// Dashboard - Clients Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ClientsTable } from './clients-table'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; archived?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search || ''
  const showArchived = params.archived === 'true'
  const perPage = 20

  // Build search filter
  const searchFilter = search
    ? {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { contactName: { contains: search, mode: 'insensitive' as const } },
          { contactEmail: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {}

  // Combine with archive filter
  const whereFilter = {
    ...searchFilter,
    isArchived: showArchived,
  }

  // Fetch clients with pagination
  const [clients, totalCount, archivedCount] = await Promise.all([
    prisma.clients.findMany({
      where: whereFilter,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        companyName: true,
        contactName: true,
        contactEmail: true,
        phone: true,
        isArchived: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
        projects: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            status: true,
            name: true,
            projectIntake: { select: { status: true } },
          },
        },
      },
    }),
    prisma.clients.count({ where: whereFilter }),
    prisma.clients.count({ where: { isArchived: true } }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  // Build URL helper
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    if (overrides.page !== undefined) params.set('page', overrides.page)
    else if (page > 1) params.set('page', String(page))
    if (overrides.search !== undefined && overrides.search) params.set('search', overrides.search)
    else if (search && overrides.search === undefined) params.set('search', search)
    if (overrides.archived !== undefined) params.set('archived', overrides.archived)
    else if (showArchived && overrides.archived === undefined) params.set('archived', 'true')
    const qs = params.toString()
    return `/dashboard/clients${qs ? `?${qs}` : ''}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Clients
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Manage client accounts and relationships
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors"
        >
          Add Client
        </Link>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={buildUrl({ archived: undefined, page: '1' })}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            !showArchived
              ? 'bg-amber-600 text-white'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--accent-subtle)]'
          }`}
        >
          Active
        </Link>
        <Link
          href={buildUrl({ archived: 'true', page: '1' })}
          className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
            showArchived
              ? 'bg-amber-600 text-white'
              : 'bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--accent-subtle)]'
          }`}
        >
          Archived {archivedCount > 0 && `(${archivedCount})`}
        </Link>
      </div>

      {/* Search */}
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
        <form method="GET" className="flex gap-4">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, company, or email..."
            className="flex-1 px-4 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          />
          {showArchived && <input type="hidden" name="archived" value="true" />}
          <button
            type="submit"
            className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:bg-[var(--accent-subtle)] transition-colors"
          >
            Search
          </button>
          {search && (
            <Link
              href={buildUrl({ search: '', page: '1' })}
              className="px-4 py-2 text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Clients Table */}
      <ClientsTable clients={clients} showArchived={showArchived} />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} clients
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1) })}
                className="px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded hover:bg-[var(--accent-subtle)]"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1) })}
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
