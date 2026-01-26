// Dashboard - Client Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientForm } from './client-form'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  // Handle "new" as a special case
  if (id === 'new') {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
          >
            ← Back to Clients
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Add New Client
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Create a new client account with portal access
          </p>
        </div>
        <ClientForm />
      </div>
    )
  }

  const client = await prisma.clients.findUnique({
    where: { id },
    include: {
      users: {
        select: { email: true, emailVerified: true, createdAt: true },
      },
      projects: {
        orderBy: { updatedAt: 'desc' },
        include: {
          service_templates: { select: { name: true } },
          _count: { select: { tasks: true, milestones: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  })

  if (!client) {
    notFound()
  }

  // Calculate totals
  const totalInvoiced = client.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalPaid = client.invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalOutstanding = client.invoices
    .filter((inv) => ['SENT', 'VIEWED', 'OVERDUE'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          ← Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              {client.companyName || client.contactName}
            </h1>
            {client.companyName && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">
                {client.contactName}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/projects/new?clientId=${client.id}`}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              New Project
            </Link>
            <Link
              href={`/dashboard/invoices/new?clientId=${client.id}`}
              className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
            >
              New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Projects</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {client.projects.length}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Invoiced</p>
          <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
          <p className="text-2xl font-semibold text-green-600 dark:text-green-400 mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
          <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500">Email</p>
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="text-gray-900 dark:text-gray-100 hover:underline"
                >
                  {client.contactEmail}
                </a>
              </div>
              {client.phone && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Phone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              )}
              {client.website && (
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-900 dark:text-gray-100 hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Portal Access */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Portal Access
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Login Email</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">{client.users.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Email Verified</span>
                <span className={`text-sm ${client.users.emailVerified ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                  {client.users.emailVerified ? 'Yes' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Account Created</span>
                <span className="text-sm text-gray-900 dark:text-gray-100">
                  {formatDate(client.users.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {client.notes && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Notes
              </h2>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          )}

          {/* Edit Client */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Edit Client
            </h2>
            <ClientForm client={client} />
          </div>
        </div>

        {/* Right Column - Projects & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                Projects ({client.projects.length})
              </h2>
              <Link
                href={`/dashboard/projects/new?clientId=${client.id}`}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                + Add Project
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {client.projects.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No projects yet
                </p>
              ) : (
                client.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="px-6 py-4 block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {project.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {project.service_templates?.name || 'Custom Project'} · {project._count.tasks} tasks · {project._count.milestones} milestones
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getProjectStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="font-medium text-gray-900 dark:text-gray-100">
                Recent Invoices
              </h2>
              <Link
                href={`/dashboard/invoices?clientId=${client.id}`}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {client.invoices.length === 0 ? (
                <p className="px-6 py-8 text-sm text-gray-500 dark:text-gray-400 text-center">
                  No invoices yet
                </p>
              ) : (
                client.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="px-6 py-4 block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {formatDate(invoice.createdAt)}
                          {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(Number(invoice.total))}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Related Leads */}
          {client.leads.length > 0 && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="font-medium text-gray-900 dark:text-gray-100">
                  Related Leads
                </h2>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {client.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="px-6 py-4 block hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          {lead.email}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(lead.createdAt)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getLeadStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
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

function getProjectStatusColor(status: string) {
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

function getInvoiceStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    VIEWED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[status] || colors.DRAFT
}

function getLeadStatusColor(status: string) {
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
