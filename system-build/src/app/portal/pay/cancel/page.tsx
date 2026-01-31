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
        <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500 dark:text-gray-400"
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
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Payment Cancelled
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            No worries — your payment was not processed.
          </p>
        </div>

        {/* Invoice Reference */}
        {invoice && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Invoice {invoice.invoiceNumber}
            </div>
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(Number(invoice.total), invoice.currency)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {invoice ? (
            <Link
              href={`/portal/invoices/${invoice.id}`}
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              Return to Invoice
            </Link>
          ) : (
            <Link
              href="/portal/invoices"
              className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
            >
              View Invoices
            </Link>
          )}
          <Link
            href="/portal"
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            Go to Portal
          </Link>
        </div>

        {/* Help */}
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Questions?{' '}
          <a
            href="mailto:hello@bertrandbrands.com"
            className="text-amber-600 dark:text-amber-400 hover:underline"
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
