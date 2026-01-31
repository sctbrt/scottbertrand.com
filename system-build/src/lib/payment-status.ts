// Payment status helpers
// Checks both the explicit paymentStatus field AND linked invoices
import { prisma } from '@/lib/prisma'
import type { PaymentStatus, PaymentProvider } from '@prisma/client'
import { createHash } from 'crypto'

interface ProjectPaymentInfo {
  paymentStatus: PaymentStatus
  invoices: Array<{
    status: string
    paidAt: Date | null
  }>
}

/**
 * Check if a project is paid.
 * Returns true if:
 * - project.paymentStatus === 'PAID', OR
 * - Any linked invoice has status === 'PAID'
 */
export function isProjectPaid(project: ProjectPaymentInfo): boolean {
  // Explicit payment status takes precedence
  if (project.paymentStatus === 'PAID') {
    return true
  }

  // Check linked invoices as fallback
  if (project.invoices && project.invoices.length > 0) {
    return project.invoices.some((inv) => inv.status === 'PAID')
  }

  return false
}

/**
 * Get payment status for a project by ID.
 * Queries both the project and its invoices.
 */
export async function getProjectPaymentStatus(projectId: string): Promise<{
  isPaid: boolean
  source: 'explicit' | 'invoice' | 'none'
}> {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    select: {
      paymentStatus: true,
      invoices: {
        select: {
          status: true,
          paidAt: true,
        },
      },
    },
  })

  if (!project) {
    return { isPaid: false, source: 'none' }
  }

  // Check explicit status first
  if (project.paymentStatus === 'PAID') {
    return { isPaid: true, source: 'explicit' }
  }

  // Check invoices
  const hasPaidInvoice = project.invoices.some((inv) => inv.status === 'PAID')
  if (hasPaidInvoice) {
    return { isPaid: true, source: 'invoice' }
  }

  return { isPaid: false, source: 'none' }
}

/**
 * Sync payment status from invoices to project.
 * Call this when an invoice is marked as paid.
 */
export async function syncPaymentStatusFromInvoice(projectId: string): Promise<void> {
  const paidInvoice = await prisma.invoices.findFirst({
    where: {
      projectId,
      status: 'PAID',
    },
  })

  if (paidInvoice) {
    await prisma.projects.update({
      where: { id: projectId },
      data: { paymentStatus: 'PAID' },
    })
  }
}

// ============================================
// Stripe Payment Event Handling
// ============================================

interface StripePaymentData {
  eventId: string
  eventType: string
  projectPublicId: string
  checkoutSessionId?: string
  paymentIntentId?: string
  amountTotal?: number
  customerEmail?: string
  metadata?: Record<string, string>
}

/**
 * Check if a Stripe event has already been processed (idempotency).
 */
export async function isEventProcessed(eventId: string): Promise<boolean> {
  const existing = await prisma.payment_events.findUnique({
    where: { eventId },
  })
  return !!existing
}

/**
 * Process a Stripe checkout.session.completed event.
 * Marks the project as paid and logs the event.
 *
 * Returns:
 * - { success: true, projectId } if processed
 * - { success: true, skipped: true } if already processed (idempotent)
 * - { success: false, error } if failed
 */
export async function processStripeCheckoutCompleted(
  data: StripePaymentData
): Promise<
  | { success: true; projectId: string; skipped?: boolean }
  | { success: false; error: string; unmatched?: boolean }
> {
  const { eventId, eventType, projectPublicId, checkoutSessionId, paymentIntentId, metadata } = data

  // Idempotency check
  if (await isEventProcessed(eventId)) {
    return { success: true, projectId: '', skipped: true }
  }

  // Find project by publicId
  const project = await prisma.projects.findUnique({
    where: { publicId: projectPublicId },
    select: { id: true, paymentStatus: true },
  })

  if (!project) {
    // Log unmatched payment for manual reconciliation
    await prisma.payment_events.create({
      data: {
        provider: 'STRIPE',
        eventId,
        eventType,
        status: 'UNMATCHED',
        errorMsg: `Project not found: ${projectPublicId}`,
        payloadHash: hashPayload(JSON.stringify(data)),
        metadata: metadata as object,
      },
    })
    return { success: false, error: `Project not found: ${projectPublicId}`, unmatched: true }
  }

  // Already paid? Just record the event and return success (idempotent)
  if (project.paymentStatus === 'PAID') {
    await prisma.payment_events.create({
      data: {
        provider: 'STRIPE',
        eventId,
        eventType,
        projectId: project.id,
        status: 'SUCCESS',
        payloadHash: hashPayload(JSON.stringify(data)),
        metadata: metadata as object,
      },
    })
    return { success: true, projectId: project.id, skipped: true }
  }

  // Process payment: update project and log event in a transaction
  await prisma.$transaction([
    prisma.projects.update({
      where: { id: project.id },
      data: {
        paymentStatus: 'PAID',
        paymentProvider: 'STRIPE',
        paidAt: new Date(),
        lastPaymentEventId: eventId,
        stripeCheckoutSessionId: checkoutSessionId,
        stripePaymentIntentId: paymentIntentId,
      },
    }),
    prisma.payment_events.create({
      data: {
        provider: 'STRIPE',
        eventId,
        eventType,
        projectId: project.id,
        status: 'SUCCESS',
        payloadHash: hashPayload(JSON.stringify(data)),
        metadata: metadata as object,
      },
    }),
  ])

  return { success: true, projectId: project.id }
}

/**
 * Mark a project as paid manually (admin override).
 * Use sparingly - for offline payments, wire transfers, etc.
 */
export async function markProjectPaidManually(
  projectId: string,
  adminUserId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    select: { paymentStatus: true },
  })

  if (!project) {
    return { success: false, error: 'Project not found' }
  }

  if (project.paymentStatus === 'PAID') {
    return { success: false, error: 'Project is already paid' }
  }

  // Create a manual payment event ID
  const manualEventId = `manual_${Date.now()}_${adminUserId}`

  await prisma.$transaction([
    prisma.projects.update({
      where: { id: projectId },
      data: {
        paymentStatus: 'PAID',
        paymentProvider: 'MANUAL',
        paidAt: new Date(),
        lastPaymentEventId: manualEventId,
      },
    }),
    prisma.payment_events.create({
      data: {
        provider: 'MANUAL',
        eventId: manualEventId,
        eventType: 'manual_override',
        projectId,
        status: 'SUCCESS',
        metadata: {
          adminUserId,
          reason: reason || 'Manual payment override',
          timestamp: new Date().toISOString(),
        },
      },
    }),
  ])

  return { success: true }
}

/**
 * Update Payment Link details on a project.
 */
export async function updateProjectPaymentLink(
  projectId: string,
  paymentLinkId: string,
  paymentLinkUrl: string
): Promise<void> {
  await prisma.projects.update({
    where: { id: projectId },
    data: {
      stripePaymentLinkId: paymentLinkId,
      stripePaymentLinkUrl: paymentLinkUrl,
    },
  })
}

/**
 * Hash payload for debugging/comparison.
 */
function hashPayload(payload: string): string {
  return createHash('sha256').update(payload).digest('hex').slice(0, 16)
}

// ============================================
// Stripe Refund Handling
// ============================================

interface StripeRefundData {
  eventId: string
  eventType: string
  chargeId: string
  paymentIntentId?: string
  refundAmount: number
  originalAmount?: number
  isFullRefund?: boolean
  currency: string
  projectId?: string
}

/**
 * Process a Stripe charge.refunded event.
 * Marks the project as PARTIALLY_REFUNDED or REFUNDED based on refund amount.
 *
 * - Full refund (charge.refunded === true): Sets status to REFUNDED
 * - Partial refund: Sets status to PARTIALLY_REFUNDED
 */
export async function processStripeRefund(
  data: StripeRefundData
): Promise<{ success: true; projectId?: string; isPartial?: boolean } | { success: false; error: string }> {
  const {
    eventId,
    eventType,
    chargeId,
    paymentIntentId,
    refundAmount,
    originalAmount,
    isFullRefund,
    currency,
    projectId,
  } = data

  // Idempotency check
  if (await isEventProcessed(eventId)) {
    return { success: true, projectId }
  }

  // Determine refund type: use Stripe's refunded flag if available, else compare amounts
  // isFullRefund comes from charge.refunded which Stripe sets to true only for full refunds
  const isPartialRefund: boolean = isFullRefund === false || (originalAmount !== undefined && refundAmount < originalAmount)
  const newStatus: PaymentStatus = isPartialRefund ? 'PARTIALLY_REFUNDED' : 'REFUNDED'

  // If we have a project, update its status
  if (projectId) {
    try {
      await prisma.$transaction([
        prisma.projects.update({
          where: { id: projectId },
          data: {
            paymentStatus: newStatus,
          },
        }),
        prisma.payment_events.create({
          data: {
            provider: 'STRIPE',
            eventId,
            eventType,
            projectId,
            status: 'SUCCESS',
            payloadHash: hashPayload(JSON.stringify(data)),
            metadata: {
              chargeId,
              paymentIntentId,
              refundAmount,
              originalAmount,
              isFullRefund,
              refundType: isPartialRefund ? 'partial' : 'full',
              currency,
            },
          },
        }),
      ])

      return { success: true, projectId, isPartial: isPartialRefund }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: message }
    }
  }

  // No project found - log as unmatched for manual reconciliation
  await prisma.payment_events.create({
    data: {
      provider: 'STRIPE',
      eventId,
      eventType,
      status: 'UNMATCHED',
      errorMsg: 'No matching project found for refund',
      payloadHash: hashPayload(JSON.stringify(data)),
      metadata: {
        chargeId,
        paymentIntentId,
        refundAmount,
        originalAmount,
        isFullRefund,
        refundType: isPartialRefund ? 'partial' : 'full',
        currency,
      },
    },
  })

  return { success: true, isPartial: isPartialRefund } // Still successful - just unmatched
}
