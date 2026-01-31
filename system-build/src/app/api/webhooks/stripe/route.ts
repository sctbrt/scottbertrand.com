/**
 * Stripe Webhook Endpoint
 *
 * Handles Stripe webhook events for payment processing.
 * See docs/payments-v1.md for event handling rules.
 *
 * Events handled:
 * - checkout.session.completed: Mark project as paid
 * - checkout.session.expired: Log only (no state change)
 * - payment_intent.payment_failed: Log only (no state change)
 * - charge.refunded: Mark project as refunded + send notification
 * - charge.dispute.created: Log security event + send alert
 */

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyStripeWebhook, STRIPE_METADATA_KEYS } from '@/lib/stripe'
import {
  processStripeCheckoutCompleted,
  processStripeRefund,
  isEventProcessed,
} from '@/lib/payment-status'
import { prisma } from '@/lib/prisma'
import { sendPaymentNotification } from '@/lib/notifications'

// Disable body parsing - we need raw body for signature verification
export const runtime = 'nodejs'

// Rate limit: 100 requests per minute (Stripe may send bursts)
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute
const RATE_LIMIT_MAX = 100
const RATE_LIMIT_CLEANUP_INTERVAL = 5 * 60 * 1000 // Cleanup every 5 minutes
const RATE_LIMIT_MAX_ENTRIES = 1000 // Max entries before forced cleanup

// In-memory rate limiting (per-IP) with automatic cleanup
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
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

function checkRateLimit(ip: string): boolean {
  const now = Date.now()

  // Periodic cleanup of stale entries
  cleanupRateLimitMap()

  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW })
    return true
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false
  }

  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
  if (!checkRateLimit(ip)) {
    console.error('[Stripe Webhook] Rate limit exceeded:', ip)
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }

  // Get webhook secret
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  // Get signature header
  const signature = request.headers.get('stripe-signature')
  if (!signature) {
    console.error('[Stripe Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Get raw body for signature verification
  let rawBody: string
  try {
    rawBody = await request.text()
  } catch (error) {
    console.error('[Stripe Webhook] Failed to read body:', error)
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Verify webhook signature
  let event: Stripe.Event
  try {
    event = verifyStripeWebhook(rawBody, signature, webhookSecret)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Stripe Webhook] Signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  // Log received event
  console.log(`[Stripe Webhook] Received: ${event.type} (${event.id})`)

  // Idempotency check (fast path)
  if (await isEventProcessed(event.id)) {
    console.log(`[Stripe Webhook] Already processed: ${event.id}`)
    return NextResponse.json({ received: true, status: 'already_processed' })
  }

  // Handle events
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        return await handleCheckoutSessionCompleted(event)

      case 'checkout.session.expired':
        return await handleCheckoutSessionExpired(event)

      case 'payment_intent.payment_failed':
        return await handlePaymentIntentFailed(event)

      case 'charge.refunded':
        return await handleChargeRefunded(event)

      case 'charge.dispute.created':
        return await handleChargeDisputeCreated(event)

      default:
        // Log unhandled events but return 200 (Stripe expects 200 for all events)
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`)
        return NextResponse.json({ received: true, status: 'unhandled' })
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[Stripe Webhook] Handler error for ${event.type}:`, message)
    // Return 500 to trigger Stripe retry
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Handle checkout.session.completed
 * This is the canonical "paid" trigger for Payment Links.
 */
async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session

  // Extract project ID from metadata
  const projectPublicId = session.metadata?.[STRIPE_METADATA_KEYS.PROJECT_PUBLIC_ID]
  const environment = session.metadata?.[STRIPE_METADATA_KEYS.ENVIRONMENT]

  // Validate environment (don't process dev events in prod, etc.)
  const currentEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development'
  if (environment && environment !== currentEnv) {
    console.log(
      `[Stripe Webhook] Skipping event for different environment: ${environment} (current: ${currentEnv})`
    )
    return NextResponse.json({ received: true, status: 'wrong_environment' })
  }

  // Handle invoice-only payments (no project linked)
  const invoiceId = session.metadata?.invoice_id

  if (!projectPublicId) {
    // If we have an invoice but no project, just mark the invoice as paid
    if (invoiceId) {
      try {
        await prisma.invoices.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })

        // Log the payment event
        await prisma.payment_events.create({
          data: {
            provider: 'STRIPE',
            eventId: event.id,
            eventType: event.type,
            status: 'SUCCESS',
            metadata: {
              sessionId: session.id,
              invoiceId,
              customerEmail: session.customer_email,
              amountTotal: session.amount_total,
              note: 'Invoice paid without linked project',
            },
          },
        })

        console.log(`[Stripe Webhook] Invoice ${invoiceId} marked as PAID (no project linked)`)

        // Send notification
        if (session.amount_total) {
          const invoice = await prisma.invoices.findUnique({
            where: { id: invoiceId },
            select: { invoiceNumber: true },
          })

          await sendPaymentNotification({
            type: 'payment',
            amount: session.amount_total / 100,
            currency: session.currency?.toUpperCase() || 'CAD',
            projectName: `Invoice ${invoice?.invoiceNumber || invoiceId}`,
          })
        }

        return NextResponse.json({ received: true, status: 'success', invoiceId })
      } catch (error) {
        console.error(`[Stripe Webhook] Failed to process invoice-only payment:`, error)
        return NextResponse.json({ error: 'Failed to process' }, { status: 500 })
      }
    }

    console.error('[Stripe Webhook] Missing project_public_id in metadata')
    // Log unmatched payment for manual reconciliation
    await prisma.payment_events.create({
      data: {
        provider: 'STRIPE',
        eventId: event.id,
        eventType: event.type,
        status: 'UNMATCHED',
        errorMsg: 'Missing project_public_id in session metadata',
        metadata: {
          sessionId: session.id,
          customerEmail: session.customer_email,
          amountTotal: session.amount_total,
        },
      },
    })
    return NextResponse.json({ received: true, status: 'unmatched' })
  }

  // Process the payment
  const result = await processStripeCheckoutCompleted({
    eventId: event.id,
    eventType: event.type,
    projectPublicId,
    checkoutSessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
    amountTotal: session.amount_total ?? undefined,
    customerEmail: session.customer_email ?? undefined,
    metadata: session.metadata ?? undefined,
  })

  if (!result.success) {
    console.error(`[Stripe Webhook] Failed to process payment: ${result.error}`)
    if (result.unmatched) {
      // Unmatched but logged - return 200 to prevent retries
      return NextResponse.json({ received: true, status: 'unmatched' })
    }
    // Other errors - return 500 to trigger retry
    return NextResponse.json({ error: result.error }, { status: 500 })
  }

  if (result.skipped) {
    console.log(`[Stripe Webhook] Payment already recorded for project: ${result.projectId}`)
  } else {
    console.log(`[Stripe Webhook] Payment successful for project: ${result.projectId}`)

    // Mark linked invoice as PAID if present
    const invoiceId = session.metadata?.invoice_id
    if (invoiceId) {
      try {
        await prisma.invoices.update({
          where: { id: invoiceId },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        })
        console.log(`[Stripe Webhook] Invoice ${invoiceId} marked as PAID`)
      } catch (invoiceError) {
        // Log but don't fail - project payment is the critical path
        console.error(`[Stripe Webhook] Failed to update invoice ${invoiceId}:`, invoiceError)
      }
    }

    // Send payment notification (only for new payments, not duplicates)
    if (session.amount_total) {
      // Fetch project name for notification
      const project = await prisma.projects.findUnique({
        where: { publicId: projectPublicId },
        select: { id: true, name: true },
      })

      await sendPaymentNotification({
        type: 'payment',
        amount: session.amount_total / 100,
        currency: session.currency?.toUpperCase() || 'CAD',
        projectName: project?.name || projectPublicId,
        projectId: project?.id,
      })
    }
  }

  return NextResponse.json({ received: true, status: 'success', projectId: result.projectId })
}

/**
 * Handle checkout.session.expired
 * Log only - no state change needed.
 */
async function handleCheckoutSessionExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const projectPublicId = session.metadata?.[STRIPE_METADATA_KEYS.PROJECT_PUBLIC_ID]

  console.log(`[Stripe Webhook] Checkout expired: ${session.id} (project: ${projectPublicId || 'unknown'})`)

  // Log for visibility but don't change any state
  await prisma.payment_events.create({
    data: {
      provider: 'STRIPE',
      eventId: event.id,
      eventType: event.type,
      status: 'SUCCESS', // Successfully logged, not an error
      metadata: {
        sessionId: session.id,
        projectPublicId,
        reason: 'Session expired before completion',
      },
    },
  })

  return NextResponse.json({ received: true, status: 'logged' })
}

/**
 * Handle payment_intent.payment_failed
 * Log only - client will see error on Stripe's hosted page.
 */
async function handlePaymentIntentFailed(event: Stripe.Event) {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  const lastError = paymentIntent.last_payment_error

  console.log(
    `[Stripe Webhook] Payment failed: ${paymentIntent.id} - ${lastError?.message || 'Unknown error'}`
  )

  // Log for visibility
  await prisma.payment_events.create({
    data: {
      provider: 'STRIPE',
      eventId: event.id,
      eventType: event.type,
      status: 'FAILED',
      errorMsg: lastError?.message || 'Payment failed',
      metadata: {
        paymentIntentId: paymentIntent.id,
        errorCode: lastError?.code,
        errorType: lastError?.type,
      },
    },
  })

  return NextResponse.json({ received: true, status: 'logged' })
}

/**
 * Handle charge.refunded
 * Mark project as partially refunded or fully refunded based on amounts.
 */
async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge
  const refundAmount = charge.amount_refunded
  const originalAmount = charge.amount
  const isFullRefund = charge.refunded // Stripe sets this true when fully refunded
  const currency = charge.currency.toUpperCase()
  const paymentIntentId =
    typeof charge.payment_intent === 'string' ? charge.payment_intent : undefined

  const refundType = isFullRefund ? 'full' : 'partial'
  console.log(
    `[Stripe Webhook] ${refundType} refund processed: ${charge.id} - ${refundAmount / 100}/${originalAmount / 100} ${currency}`
  )

  // Try to find the project via payment intent
  let project = null
  if (paymentIntentId) {
    project = await prisma.projects.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, publicId: true, name: true, paymentStatus: true },
    })
  }

  // Process the refund
  const result = await processStripeRefund({
    eventId: event.id,
    eventType: event.type,
    chargeId: charge.id,
    paymentIntentId,
    refundAmount,
    originalAmount,
    isFullRefund,
    currency,
    projectId: project?.id,
  })

  // Send notification (include partial refund info)
  await sendPaymentNotification({
    type: 'refund',
    amount: refundAmount / 100,
    currency,
    projectName: project?.name || 'Unknown Project',
    projectId: project?.id,
    chargeId: charge.id,
    isPartialRefund: !isFullRefund,
    originalAmount: originalAmount / 100,
  })

  if (result.success) {
    const refundType = result.isPartial ? 'Partial refund' : 'Full refund'
    console.log(`[Stripe Webhook] ${refundType} recorded for project: ${result.projectId || 'unmatched'}`)
  } else {
    console.error(`[Stripe Webhook] Failed to process refund: ${result.error}`)
  }

  return NextResponse.json({ received: true, status: result.success ? 'success' : 'logged' })
}

/**
 * Handle charge.dispute.created
 * Log security event and send urgent alert.
 */
async function handleChargeDisputeCreated(event: Stripe.Event) {
  const dispute = event.data.object as Stripe.Dispute
  const charge =
    typeof dispute.charge === 'string' ? dispute.charge : (dispute.charge as Stripe.Charge)?.id
  const amount = dispute.amount
  const currency = dispute.currency.toUpperCase()
  const reason = dispute.reason

  console.error(
    `[Stripe Webhook] DISPUTE CREATED: ${dispute.id} - ${amount / 100} ${currency} - Reason: ${reason}`
  )

  // Try to find the project via charge or payment intent
  let project = null
  if (dispute.payment_intent) {
    const paymentIntentId =
      typeof dispute.payment_intent === 'string'
        ? dispute.payment_intent
        : dispute.payment_intent.id
    project = await prisma.projects.findFirst({
      where: { stripePaymentIntentId: paymentIntentId },
      select: { id: true, publicId: true, name: true },
    })
  }

  // Log the dispute event
  await prisma.payment_events.create({
    data: {
      provider: 'STRIPE',
      eventId: event.id,
      eventType: event.type,
      projectId: project?.id,
      status: 'DISPUTE',
      errorMsg: `Dispute: ${reason}`,
      metadata: {
        disputeId: dispute.id,
        chargeId: charge,
        amount,
        currency,
        reason,
        projectName: project?.name,
      },
    },
  })

  // Send urgent notification
  await sendPaymentNotification({
    type: 'dispute',
    amount: amount / 100,
    currency,
    projectName: project?.name || 'Unknown Project',
    projectId: project?.id,
    disputeId: dispute.id,
    reason,
    priority: 1, // High priority for disputes
  })

  return NextResponse.json({ received: true, status: 'logged' })
}
