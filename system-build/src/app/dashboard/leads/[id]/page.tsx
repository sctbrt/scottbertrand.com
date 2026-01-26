// Dashboard - Lead Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { LeadActions } from './lead-actions'
import { ConvertToClientForm } from './convert-form'

interface LeadDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function LeadDetailPage({ params }: LeadDetailPageProps) {
  const { id } = await params

  const [lead, templates] = await Promise.all([
    prisma.leads.findUnique({
      where: { id },
      include: {
        service_templates: true,
        clients: {
          include: {
            users: { select: { email: true } },
          },
        },
        users: {
          select: { name: true, email: true },
        },
      },
    }),
    prisma.service_templates.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    }),
  ])

  if (!lead) {
    notFound()
  }

  const formData = (lead.formData as Record<string, unknown>) || {}

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/leads"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          ← Back to Leads
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                {lead.name || lead.email}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                {lead.status}
              </span>
              {lead.isSpam && (
                <span className="text-sm px-3 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                  Spam
                </span>
              )}
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Submitted {formatDate(lead.createdAt)}
              {lead.source && ` via ${lead.source}`}
            </p>
          </div>
          <LeadActions lead={lead} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Lead Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Contact Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.email && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Email</p>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {lead.email}
                  </a>
                </div>
              )}
              {lead.name && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Name</p>
                  <p className="text-gray-900 dark:text-gray-100">{lead.name}</p>
                </div>
              )}
              {lead.companyName && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Company</p>
                  <p className="text-gray-900 dark:text-gray-100">{lead.companyName}</p>
                </div>
              )}
              {lead.phone && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Phone</p>
                  <a
                    href={`tel:${lead.phone}`}
                    className="text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {lead.phone}
                  </a>
                </div>
              )}
              {lead.website && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Website</p>
                  <a
                    href={lead.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {lead.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Service Interest */}
          {(lead.service || lead.service_templates) && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Service Interest
              </h2>
              {lead.service_templates ? (
                <Link
                  href={`/dashboard/templates/${lead.service_templates.id}`}
                  className="block p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {lead.service_templates.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatCurrency(Number(lead.service_templates.price))}
                      </p>
                    </div>
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">{lead.service}</p>
              )}
            </div>
          )}

          {/* Message */}
          {lead.message && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Message
              </h2>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {lead.message}
              </p>
            </div>
          )}

          {/* Raw Form Data */}
          {Object.keys(formData).length > 0 && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Raw Form Data
              </h2>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {JSON.stringify(formData, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Converted Client */}
          {lead.clients && (
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 p-6">
              <h2 className="text-sm font-medium text-green-700 dark:text-green-300 uppercase tracking-wider mb-4">
                Converted to Client
              </h2>
              <Link
                href={`/dashboard/clients/${lead.clients.id}`}
                className="flex items-center justify-between p-4 bg-white dark:bg-green-900/30 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/40 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {lead.clients.companyName || lead.clients.contactName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {lead.clients.users.email}
                  </p>
                </div>
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          )}
        </div>

        {/* Right Column - Actions & Convert */}
        <div className="space-y-6">
          {/* Meta Information */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Lead Information
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(lead.status)}`}>
                  {lead.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(lead.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Updated</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(lead.updatedAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Source</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {lead.source || 'Unknown'}
                </span>
              </div>
              {lead.users && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Created By</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {lead.users.name || lead.users.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Convert to Client (if not already converted) */}
          {lead.status !== 'CONVERTED' && !lead.clients && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Convert to Client
              </h2>
              <ConvertToClientForm lead={lead} templates={templates} />
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <a
                href={`mailto:${lead.email}`}
                className="flex items-center gap-2 w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Send Email
              </a>
              {lead.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-2 w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Call
                </a>
              )}
              {lead.website && (
                <a
                  href={lead.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
