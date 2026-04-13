// Client Portal - Invoice Detail Page
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PayInvoiceButton } from './components/pay-invoice-button'

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function PortalInvoiceDetailPage({ params }: InvoicePageProps) {
  const session = await auth()
  if (!session?.user) return null

  const { id } = await params

  // Get client and verify ownership
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  if (!client && session.user.role !== 'INTERNAL_ADMIN') {
    notFound()
  }

  // Fetch invoice
  const invoice = await prisma.invoices.findFirst({
    where: {
      id,
      // Only show client's own invoices (unless admin)
      ...(session.user.role === 'CLIENT' ? { clientId: client?.id } : {}),
      // Don't show draft invoices to clients
      ...(session.user.role === 'CLIENT' ? { status: { not: 'DRAFT' } } : {}),
    },
    include: {
      clients: {
        select: { companyName: true, contactName: true, contactEmail: true },
      },
      projects: {
        select: {
          id: true,
          name: true,
          publicId: true,
          stripePaymentLinkUrl: true,
          paymentStatus: true,
        },
      },
    },
  })

  if (!invoice) {
    notFound()
  }

  // Mark as viewed if client is viewing (and status is SENT)
  if (session.user.role === 'CLIENT' && invoice.status === 'SENT') {
    await prisma.invoices.update({
      where: { id },
      data: { status: 'VIEWED' },
    })
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
      {/* Back Link */}
      <Link
        href="/portal/invoices"
        className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
      >
        ← Back to Invoices
      </Link>

      {/* Invoice Card */}
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden max-w-3xl">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)]">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-xl font-semibold text-[var(--text)]">
                Bertrand Brands
              </h1>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                bertrandbrands.ca
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[var(--text-muted)]">Invoice</p>
              <p className="text-lg font-semibold text-[var(--text)]">
                {invoice.invoiceNumber}
              </p>
              <span className={`inline-block mt-2 text-xs px-3 py-1 rounded-full ${getStatusColor(invoice.status)}`}>
                {getStatusLabel(invoice.status)}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Dates */}
        <div className="p-6 border-b border-[var(--border)] grid grid-cols-2 gap-6">
          <div>
            <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-2">
              Bill To
            </p>
            <p className="font-medium text-[var(--text)]">
              {invoice.clients.companyName || invoice.clients.contactName}
            </p>
            {invoice.clients.companyName && (
              <p className="text-sm text-[var(--text-muted)]">
                {invoice.clients.contactName}
              </p>
            )}
            <p className="text-sm text-[var(--text-muted)]">
              {invoice.clients.contactEmail}
            </p>
          </div>
          <div className="text-right">
            <div className="mb-4">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">
                Invoice Date
              </p>
              <p className="text-[var(--text)]">
                {formatDate(invoice.createdAt)}
              </p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">
                  Due Date
                </p>
                <p className={`${isOverdue(invoice.dueDate, invoice.status) ? 'text-red-600 dark:text-red-400 font-medium' : 'text-[var(--text)]'}`}>
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Project Reference */}
        {invoice.projects && (
          <div className="px-6 py-4 bg-[var(--surface-2)] border-b border-[var(--border)]">
            <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-1">
              Project
            </p>
            <Link
              href={`/portal/projects/${invoice.projects.id}`}
              className="text-[var(--text)] hover:underline"
            >
              {invoice.projects.name}
            </Link>
          </div>
        )}

        {/* Line Items */}
        <div className="p-6">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-[var(--text-subtle)] uppercase tracking-wider">
                <th className="text-left pb-3">Description</th>
                <th className="text-right pb-3 w-20">Qty</th>
                <th className="text-right pb-3 w-28">Rate</th>
                <th className="text-right pb-3 w-28">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {lineItems.map((item: InvoiceLineItem, index: number) => (
                <tr key={index}>
                  <td className="py-3">
                    <p className="text-[var(--text)]">{item.description}</p>
                    {item.details && (
                      <p className="text-sm text-[var(--text-muted)]">{item.details}</p>
                    )}
                  </td>
                  <td className="py-3 text-right text-[var(--text)]">
                    {item.quantity}
                  </td>
                  <td className="py-3 text-right text-[var(--text)]">
                    {formatCurrency(item.rate)}
                  </td>
                  <td className="py-3 text-right text-[var(--text)] font-medium">
                    {formatCurrency(item.quantity * item.rate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="p-6 bg-[var(--surface-2)] border-t border-[var(--border)]">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)]">Subtotal</span>
                <span className="text-[var(--text)]">{formatCurrency(Number(invoice.subtotal))}</span>
              </div>
              {Number(invoice.tax) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Tax</span>
                  <span className="text-[var(--text)]">{formatCurrency(Number(invoice.tax))}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-semibold pt-2 border-t border-[var(--border)]">
                <span className="text-[var(--text)]">Total</span>
                <span className="text-[var(--text)]">{formatCurrency(Number(invoice.total))}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {invoice.status === 'PAID' && invoice.paidAt && (
          <div className="p-6 bg-green-50 dark:bg-green-900/20 border-t border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-green-700 dark:text-green-300">Payment Received</p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Paid on {formatDate(invoice.paidAt)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="p-6 border-t border-[var(--border)]">
            <p className="text-xs text-[var(--text-subtle)] uppercase tracking-wider mb-2">
              Notes
            </p>
            <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
              {invoice.notes}
            </p>
          </div>
        )}

        {/* Pay Now CTA - Show if unpaid and has line items */}
        {!['PAID', 'CANCELLED'].includes(invoice.status) &&
          invoice.projects?.paymentStatus !== 'PAID' &&
          lineItems.length > 0 && (
          <div className="p-6 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-amber-700 dark:text-amber-300">
                  Ready to pay?
                </p>
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Pay securely with credit card via Stripe.
                </p>
              </div>
              <PayInvoiceButton
                invoiceId={invoice.id}
                total={Number(invoice.total)}
                currency={invoice.currency}
              />
            </div>
          </div>
        )}

        {/* Contact for Questions */}
        {!['PAID', 'CANCELLED'].includes(invoice.status) && (
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Questions about this invoice? Reply to the invoice email or contact us at{' '}
              <a href="mailto:hello@bertrandbrands.ca" className="underline">
                hello@bertrandbrands.ca
              </a>
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
    SENT: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    VIEWED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
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
