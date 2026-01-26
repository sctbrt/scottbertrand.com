// Client Portal - Invoices Page
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

export default async function PortalInvoicesPage() {
  const session = await auth()
  if (!session?.user) return null

  // Get client's invoices
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    include: {
      invoices: {
        orderBy: { createdAt: 'desc' },
        include: {
          projects: {
            select: { name: true },
          },
        },
      },
    },
  })

  const invoices = client?.invoices || []

  // Calculate totals
  const totalOutstanding = invoices
    .filter((inv) => ['SENT', 'VIEWED', 'OVERDUE'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  const totalPaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          Your Invoices
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View and track your invoices
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding Balance</p>
          <p className="text-3xl font-semibold text-orange-600 dark:text-orange-400 mt-2">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Paid</p>
          <p className="text-3xl font-semibold text-green-600 dark:text-green-400 mt-2">
            {formatCurrency(totalPaid)}
          </p>
        </div>
      </div>

      {invoices.length === 0 ? (
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No invoices yet
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your invoices will appear here when issued.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Link
              key={invoice.id}
              href={`/portal/invoices/${invoice.id}`}
              className="block bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {invoice.invoiceNumber}
                    </p>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                      {getStatusLabel(invoice.status)}
                    </span>
                  </div>
                  {invoice.projects && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {invoice.projects.name}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Issued {formatDate(invoice.createdAt)}
                    {invoice.dueDate && (
                      <>
                        {' · '}
                        <span className={isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600 dark:text-red-400 font-medium' : ''}>
                          Due {formatDate(invoice.dueDate)}
                        </span>
                      </>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {formatCurrency(Number(invoice.total))}
                  </p>
                  {invoice.status === 'PAID' && invoice.paidAt && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      Paid {formatDate(invoice.paidAt)}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    VIEWED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    PAID: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    OVERDUE: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    CANCELLED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  }
  return colors[status] || colors.SENT
}

function getStatusLabel(status: string) {
  const labels: Record<string, string> = {
    DRAFT: 'Draft',
    SENT: 'Awaiting Payment',
    VIEWED: 'Awaiting Payment',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  }
  return labels[status] || status
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
