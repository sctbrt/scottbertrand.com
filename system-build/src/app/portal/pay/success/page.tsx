/**
 * Payment Success Page
 *
 * Displayed after successful Stripe Checkout.
 * Retrieves session details and shows confirmation.
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import Link from 'next/link'
import { redirect } from 'next/navigation'

interface SuccessPageProps {
  searchParams: Promise<{ session_id?: string }>
}

export default async function PaymentSuccessPage({ searchParams }: SuccessPageProps) {
  const session = await auth()
  if (!session?.user) {
    redirect('/auth/signin')
  }

  const { session_id } = await searchParams

  // Get client for ownership verification
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  })

  // Fetch checkout session details from Stripe
  let checkoutSession = null
  let invoice = null

  if (session_id) {
    try {
      checkoutSession = await stripe.checkout.sessions.retrieve(session_id)

      // Find the invoice from metadata
      const invoiceId = checkoutSession.metadata?.invoice_id
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
            projects: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        })
      }
    } catch (error) {
      console.error('[Payment Success] Error fetching session:', error)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full text-center space-y-6">
        {/* Success Icon */}
        <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600 dark:text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        {/* Heading */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Thank you for choosing Bertrand Brands
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We&apos;re looking forward to working with you.
          </p>
        </div>

        {/* Invoice Details */}
        {invoice && (
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-left">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">
              Invoice
            </div>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {invoice.invoiceNumber}
            </div>
            {invoice.projects?.name && (
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {invoice.projects.name}
              </div>
            )}
            <div className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-2">
              {formatCurrency(Number(invoice.total), invoice.currency)}
            </div>
          </div>
        )}

        {/* What's Next */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-left">
          <div className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
            What happens next
          </div>
          <ul className="text-sm text-blue-600 dark:text-blue-400 space-y-1">
            <li>• You&apos;ll receive a confirmation email shortly</li>
            <li>• Scott will reach out within 1 business day to get started</li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/portal/invoices"
            className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
          >
            View Invoices
          </Link>
          <Link
            href="/portal"
            className="px-5 py-2.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
          >
            Go to Portal
          </Link>
        </div>
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
