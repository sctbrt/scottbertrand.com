/**
 * Payment Cancelled Page
 *
 * Displayed when user cancels Stripe Checkout.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface CancelPageProps {
  searchParams: Promise<{ invoiceId?: string }>
}

export default async function PaymentCancelPage({ searchParams }: CancelPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { invoiceId } = await searchParams

  // Get client for ownership verification
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  // Fetch invoice (with ownership check)
  let invoice = null
  if (invoiceId) {
    invoice = await prisma.invoices.findFirst({
      where: {
        id: invoiceId,
        // Security: Only show if user owns this invoice (unless admin)
        ...(session.user.role === 'CLIENT' ? { clientId: client?.id } : {}),
      },
      select: {
        id: true,
        invoiceNumber: true,
        total: true,
        currency: true,
      },
    })
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto bg-[var(--surface-2)] rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-[var(--text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Payment Cancelled
          </h1>
          <p className="mt-2 text-[var(--text-muted)]">
            No worries — your payment was not processed.
          </p>
        </div>

        {/* Invoice Reference */}
        {invoice && (
          <div className="bg-[var(--surface-2)] rounded-lg p-4">
            <div className="text-sm text-[var(--text-muted)]">
              Invoice {invoice.invoiceNumber}
            </div>
            <div className="text-lg font-semibold text-[var(--text)]">
              {formatCurrency(Number(invoice.total), invoice.currency)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {invoice ? (
            <Link
              href={`/portal/invoices/${invoice.id}`}
              className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
            >
              Return to Invoice
            </Link>
          ) : (
            <Link
              href="/portal/invoices"
              className="px-5 py-2.5 bg-[var(--accent)] text-white rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm font-medium"
            >
              View Invoices
            </Link>
          )}
          <Link
            href="/portal"
            className="px-5 py-2.5 bg-[var(--surface-2)] text-[var(--text)] rounded-lg hover:opacity-90 transition-colors text-sm font-medium"
          >
            Go to Portal
          </Link>
        </div>

        {/* Help */}
        <p className="text-sm text-[var(--text-muted)]">
          Questions?{' '}
          <a
            href="mailto:hello@bertrandbrands.ca"
            className="text-[var(--accent)] hover:underline"
          >
            Contact us
          </a>
        </p>
      </div>
    </div>
  )
}

function formatCurrency(amount: number, currency: string = 'CAD') {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency,
  }).format(amount)
}
