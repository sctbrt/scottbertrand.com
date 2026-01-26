// Dashboard - Leads Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { LeadStatus } from '@prisma/client'

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>
}) {
  const params = await searchParams
  const status = params.status || undefined
  const page = parseInt(params.page || '1')
  const perPage = 20

  // Fetch leads with filtering and pagination
  const [leads, totalCount] = await Promise.all([
    prisma.leads.findMany({
      where: status ? { status: status as LeadStatus } : undefined,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        service_templates: {
          select: { name: true },
        },
      },
    }),
    prisma.leads.count({
      where: status ? { status: status as LeadStatus } : undefined,
    }),
  ])

  const totalPages = Math.ceil(totalCount / perPage)

  // Status counts for filters
  const statusCounts = await prisma.leads.groupBy({
    by: ['status'],
    _count: { id: true },
  })

  const statusCountMap = statusCounts.reduce((acc, curr) => {
    acc[curr.status] = curr._count.id
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Leads
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage intake submissions and lead conversion
          </p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        <FilterChip
          label={`All (${totalCount})`}
          href="/dashboard/leads"
          active={!status}
        />
        {['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED', 'ARCHIVED'].map((s) => (
          <FilterChip
            key={s}
            label={`${s} (${statusCountMap[s] || 0})`}
            href={`/dashboard/leads?status=${s}`}
            active={status === s}
          />
        ))}
      </div>

      {/* Leads Table */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/leads/${lead.id}`} className="block">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {lead.name || 'No name'}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {lead.email}
                      </p>
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                    {lead.service_templates?.name || lead.service || '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {lead.source || '—'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(lead.createdAt)}
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
            Showing {(page - 1) * perPage + 1} to {Math.min(page * perPage, totalCount)} of {totalCount} leads
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/dashboard/leads?page=${page - 1}${status ? `&status=${status}` : ''}`}
                className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/dashboard/leads?page=${page + 1}${status ? `&status=${status}` : ''}`}
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
      className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
        active
          ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </Link>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CONTACTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    QUALIFIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CONVERTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    DISQUALIFIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    ARCHIVED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[status] || colors.NEW
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
