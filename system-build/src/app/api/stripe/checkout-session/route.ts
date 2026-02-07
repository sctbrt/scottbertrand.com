/**
 * Stripe Checkout Session API
 *
 * POST /api/stripe/checkout-session
 *
 * Creates a Stripe Checkout Session from an invoice.
 * Used by the client portal to initiate payment.
 *
 * Request body: { invoiceId: string }
 * Response: { url: string } - Stripe Checkout URL to redirect to
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe, STRIPE_METADATA_KEYS, STRIPE_PURPOSES } from '@/lib/stripe'
import { validateOrigin } from '@/lib/csrf'

// Rate limiting (in-memory with automatic cleanup)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 10 // 10 checkout attempts per minute
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000 // Cleanup every 5 minutes
const RATE_LIMIT_MAX_ENTRIES = 1000 // Max entries before forced cleanup

let lastCleanup = Date.now()

function cleanupRateLimitMap(): void {
  const now = Date.now()
  // Only cleanup if interval passed or map is too large
  if (now - lastCleanup < RATE_LIMIT_CLEANUP_INTERVAL && rateLimitMap.size < RATE_LIMIT_MAX_ENTRIES) {
    return
  }

  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
  lastCleanup = now
}

function checkRateLimit(key: string): boolean {
  const now = Date.now()

  // Periodic cleanup of stale entries
  cleanupRateLimitMap()

  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // CSRF protection
    const csrfError = validateOrigin(request)
    if (csrfError) {
      console.warn(`[Checkout Session] CSRF blocked: ${csrfError}`)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Auth check
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Rate limit by user
    if (!checkRateLimit(session.user.id)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    // Parse request body
    const body = await request.json()
    const { invoiceId } = body

    if (!invoiceId || typeof invoiceId !== 'string') {
      return NextResponse.json({ error: 'invoiceId is required' }, { status: 400 })
    }

    // Get client for ownership verification
    const client = await prisma.clients.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    // Fetch invoice with project
    const invoice = await prisma.invoices.findFirst({
      where: {
        id: invoiceId,
        // Ownership check (unless admin)
        ...(session.user.role === 'CLIENT' ? { clientId: client?.id } : {}),
        // Must not be paid/cancelled/draft
        status: { notIn: ['PAID', 'CANCELLED', 'DRAFT'] },
      },
      include: {
        clients: {
          select: {
            id: true,
            contactEmail: true,
            contactName: true,
            companyName: true,
          },
        },
        projects: {
          select: {
            id: true,
            publicId: true,
            name: true,
            paymentStatus: true,
          },
        },
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found or not payable' },
        { status: 404 }
      )
    }

    // Check if project is already paid
    if (invoice.projects?.paymentStatus === 'PAID') {
      return NextResponse.json(
        { error: 'This invoice has already been paid' },
        { status: 400 }
      )
    }

    // Parse line items from invoice
    interface InvoiceLineItem {
      description: string
      details?: string
      quantity: number
      rate: number
    }
    const lineItems = (invoice.lineItems as InvoiceLineItem[] | null) || []

    if (lineItems.length === 0) {
      return NextResponse.json(
        { error: 'Invoice has no line items' },
        { status: 400 }
      )
    }

    // Build Stripe line items
    const stripeLineItems = lineItems.map((item) => ({
      price_data: {
        currency: invoice.currency.toLowerCase(),
        product_data: {
          name: item.description,
          ...(item.details ? { description: item.details } : {}),
        },
        unit_amount: Math.round(item.rate * 100), // Convert to cents
      },
      quantity: item.quantity,
    }))

    // Add tax as a separate line item if present
    if (Number(invoice.tax) > 0) {
      stripeLineItems.push({
        price_data: {
          currency: invoice.currency.toLowerCase(),
          product_data: {
            name: 'Tax (HST)',
          },
          unit_amount: Math.round(Number(invoice.tax) * 100),
        },
        quantity: 1,
      })
    }

    // Build metadata
    const metadata: Record<string, string> = {
      [STRIPE_METADATA_KEYS.PURPOSE]: STRIPE_PURPOSES.PROJECT_PAYMENT,
      [STRIPE_METADATA_KEYS.ENVIRONMENT]:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
      [STRIPE_METADATA_KEYS.CLIENT_ID]: invoice.clients.id,
      invoice_id: invoice.id,
      invoice_number: invoice.invoiceNumber,
    }

    // Add project metadata if linked
    if (invoice.projects?.publicId) {
      metadata[STRIPE_METADATA_KEYS.PROJECT_PUBLIC_ID] = invoice.projects.publicId
    }

    // Base URL for redirects
    const baseUrl = process.env.NEXTAUTH_URL || 'https://dashboard.bertrandbrands.com'

    // Create Stripe Checkout Session
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: invoice.clients.contactEmail,
      client_reference_id: invoice.id,
      line_items: stripeLineItems,
      metadata,
      success_url: `${baseUrl}/portal/pay/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/portal/pay/cancel?invoiceId=${invoice.id}`,
      // Optional: Set expiration (default is 24 hours)
      expires_at: Math.floor(Date.now() / 1000) + 60 * 30, // 30 minutes
    })

    // Store checkout session ID on project for tracking
    if (invoice.projects?.id) {
      await prisma.projects.update({
        where: { id: invoice.projects.id },
        data: {
          stripeCheckoutSessionId: checkoutSession.id,
        },
      })
    }

    console.log(
      `[Checkout Session] Created for invoice ${invoice.invoiceNumber}: ${checkoutSession.id}`
    )

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
    })
  } catch (error) {
    console.error('[Checkout Session] Error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
