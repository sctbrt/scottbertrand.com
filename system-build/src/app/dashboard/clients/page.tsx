// Dashboard - Clients Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search || ''
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

  // Fetch clients with pagination
  const [clients, totalCount] = await Promise.all([
    prisma.clients.findMany({
      where: searchFilter,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        _count: {
          select: {
            projects: true,
            invoices: true,
          },
        },
        projects: {
          take: 1,
          orderBy: { updatedAt: 'desc' },
          select: { status: true, name: true },
        },
      },
    }),
    prisma.clients.count({ where: searchFilter }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Clients
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage client accounts and relationships
          </p>
        </div>
        <Link
          href="/dashboard/clients/new"
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          Add Client
        </Link>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <form method="GET" className="flex gap-4">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name, company, or email..."
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Search
          </button>
          {search && (
            <Link
              href="/dashboard/clients"
              className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Client
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Projects
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Latest Project
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  {search ? 'No clients found matching your search' : 'No clients yet'}
                </td>
              </tr>
            ) : (
              clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/clients/${client.id}`} className="block">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {client.companyName || client.contactName}
                      </p>
                      {client.companyName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {client.contactName}
                        </p>
                      )}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {client.contactEmail}
                    </p>
                    {client.phone && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {client.phone}
                      </p>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {client._count.projects}
                  </td>
                  <td className="px-6 py-4">
                    {client.projects[0] ? (
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-[200px]">
                          {client.projects[0].name}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(client.projects[0].status)}`}>
                          {client.projects[0].status.replace('_', ' ')}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(client.createdAt)}
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
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} clients
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/clients?page=${page - 1}${search ? `&search=${search}` : ''}`}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/clients?page=${page + 1}${search ? `&search=${search}` : ''}`}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
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

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    PENDING_APPROVAL: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    ON_HOLD: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
    COMPLETED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CANCELLED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  }
  return colors[status] || colors.DRAFT
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
