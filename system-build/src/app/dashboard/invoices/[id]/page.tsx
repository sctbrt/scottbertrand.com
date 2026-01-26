// Dashboard - Invoice Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { InvoiceForm } from './invoice-form'
import { InvoiceActions } from './invoice-actions'

interface InvoiceDetailPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ clientId?: string; projectId?: string }>
}

export default async function InvoiceDetailPage({ params, searchParams }: InvoiceDetailPageProps) {
  const { id } = await params
  const queryParams = await searchParams

  // Fetch clients and projects for the form
  const [clients, projects] = await Promise.all([
    prisma.clients.findMany({
      select: { id: true, companyName: true, contactName: true, contactEmail: true },
      orderBy: { companyName: 'asc' },
    }),
    prisma.projects.findMany({
      select: { id: true, name: true, clientId: true },
      orderBy: { name: 'asc' },
    }),
  ])

  // Handle "new" as a special case
  if (id === 'new') {
    // Generate next invoice number
    const lastInvoice = await prisma.invoices.findFirst({
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    })

    const nextNumber = generateNextInvoiceNumber(lastInvoice?.invoiceNumber)

    // If projectId provided, get project details for line items
    let preselectedProject = null
    if (queryParams.projectId) {
      preselectedProject = await prisma.projects.findUnique({
        where: { id: queryParams.projectId },
        include: {
          service_templates: true,
          project_service_instances: {
            include: { service_templates: true },
          },
        },
      })
    }

    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
          >
            ← Back to Invoices
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Create New Invoice
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Invoice #{nextNumber}
          </p>
        </div>
        <div className="max-w-4xl">
          <InvoiceForm
            invoiceNumber={nextNumber}
            clients={clients}
            projects={projects}
            preselectedClientId={queryParams.clientId}
            preselectedProjectId={queryParams.projectId}
            preselectedProject={preselectedProject}
          />
        </div>
      </div>
    )
  }

  // Fetch existing invoice
  const invoice = await prisma.invoices.findUnique({
    where: { id },
    include: {
      clients: {
        select: { id: true, companyName: true, contactName: true, contactEmail: true },
      },
      projects: {
        select: { id: true, name: true },
      },
      file_assets: true,
    },
  })

  if (!invoice) {
    notFound()
  }

  interface InvoiceLineItem {
    description: string
    details?: string
    quantity: number
    rate: number
  }
  const lineItems = (invoice.lineItems as InvoiceLineItem[] | null) || []

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/invoices"
          className="inline-flex items-center text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
        >
          ← Back to Invoices
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                Invoice {invoice.invoiceNumber}
              </h1>
              <span className={`text-sm px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                {invoice.status}
              </span>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              <Link
                href={`/dashboard/clients/${invoice.clients.id}`}
                className="hover:underline"
              >
                {invoice.clients.companyName || invoice.clients.contactName}
              </Link>
              {invoice.projects && (
                <>
                  {' · '}
                  <Link
                    href={`/dashboard/projects/${invoice.projects.id}`}
                    className="hover:underline"
                  >
                    {invoice.projects.name}
                  </Link>
                </>
              )}
            </p>
          </div>
          <InvoiceActions invoice={invoice} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Invoice Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Preview Card */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Invoice Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    Bertrand Brands
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    bertrandbrands.com
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Number</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {invoice.invoiceNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Bill To & Dates */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Bill To
                </p>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  {invoice.clients.companyName || invoice.clients.contactName}
                </p>
                {invoice.clients.companyName && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {invoice.clients.contactName}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {invoice.clients.contactEmail}
                </p>
              </div>
              <div className="text-right">
                <div className="mb-4">
                  <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                    Invoice Date
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.createdAt)}
                  </p>
                </div>
                {invoice.dueDate && (
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                      Due Date
                    </p>
                    <p className={`${isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-900 dark:text-gray-100'}`}>
                      {formatDate(invoice.dueDate)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Line Items */}
            <div className="p-6">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    <th className="text-left pb-3">Description</th>
                    <th className="text-right pb-3 w-20">Qty</th>
                    <th className="text-right pb-3 w-28">Rate</th>
                    <th className="text-right pb-3 w-28">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {lineItems.map((item: InvoiceLineItem, index: number) => (
                    <tr key={index}>
                      <td className="py-3">
                        <p className="text-gray-900 dark:text-gray-100">{item.description}</p>
                        {item.details && (
                          <p className="text-sm text-gray-500 dark:text-gray-400">{item.details}</p>
                        )}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {item.quantity}
                      </td>
                      <td className="py-3 text-right text-gray-700 dark:text-gray-300">
                        {formatCurrency(item.rate)}
                      </td>
                      <td className="py-3 text-right text-gray-900 dark:text-gray-100 font-medium">
                        {formatCurrency(item.quantity * item.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrency(Number(invoice.subtotal))}</span>
                  </div>
                  {Number(invoice.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Tax</span>
                      <span className="text-gray-900 dark:text-gray-100">{formatCurrency(Number(invoice.tax))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-gray-900 dark:text-gray-100">{formatCurrency(Number(invoice.total))}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {invoice.notes && (
              <div className="p-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">
                  Notes
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details & Edit */}
        <div className="space-y-6">
          {/* Status & Dates */}
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Invoice Details
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Status</span>
                <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Created</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {formatDate(invoice.createdAt)}
                </span>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Due Date</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {formatDate(invoice.dueDate)}
                  </span>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Paid</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatDate(invoice.paidAt)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Currency</span>
                <span className="text-gray-900 dark:text-gray-100">{invoice.currency}</span>
              </div>
            </div>
          </div>

          {/* Edit Form (for draft invoices) */}
          {invoice.status === 'DRAFT' && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Edit Invoice
              </h2>
              <InvoiceForm
                invoice={invoice}
                invoiceNumber={invoice.invoiceNumber}
                clients={clients}
                projects={projects}
              />
            </div>
          )}

          {/* PDF Download */}
          {invoice.file_assets && (
            <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                PDF Version
              </h2>
              <a
                href={`/api/files/${invoice.file_assets.id}/download`}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    Download PDF
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {invoice.file_assets.originalName}
                  </p>
                </div>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function generateNextInvoiceNumber(lastNumber?: string | null): string {
  const prefix = 'BB'
  const year = new Date().getFullYear().toString().slice(-2)

  if (!lastNumber) {
    return `${prefix}${year}-0001`
  }

  // Parse existing number
  const match = lastNumber.match(/^BB(\d{2})-(\d{4})$/)
  if (match) {
    const lastYear = match[1]
    const lastSeq = parseInt(match[2])

    if (lastYear === year) {
      // Same year, increment
      return `${prefix}${year}-${String(lastSeq + 1).padStart(4, '0')}`
    }
  }

  // New year or invalid format, start fresh
  return `${prefix}${year}-0001`
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
