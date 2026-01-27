// Dashboard - Leads Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import type { LeadStatus } from '@prisma/client'
import { RefreshButton } from './refresh-button'
import { LeadsTable } from './leads-table'

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
        <RefreshButton />
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

      {/* Leads Table with Selection */}
      <LeadsTable leads={leads} />

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
