'use server'

/**
 * Server Actions for Care System
 *
 * Handles subscription management, ticket CRUD, credit operations,
 * and admin triage workflows. All actions require authentication.
 */

import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import {
  spendCredits,
  refundCredits,
  adjustCredits,
  getBalanceSummary,
  getCreditCost,
  getPlanCredits,
  allocateLot,
  PLAN_CREDITS,
} from '@/lib/care-credits'
import type { CarePlan, CareCreditSize } from '@prisma/client'

export type CareActionState = {
  error?: string
  success?: boolean
  data?: Record<string, unknown>
} | null

// ============================================
// SUBSCRIPTION MANAGEMENT (Admin Only)
// ============================================

/**
 * Create a Care subscription for a client.
 * Admin-only action. Sets up the subscription and allocates the first credit lot.
 */
export async function createCareSubscription(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const clientId = formData.get('clientId') as string
  const plan = formData.get('plan') as CarePlan
  const stripeSubscriptionId = formData.get('stripeSubscriptionId') as string | null
  const stripeCustomerId = formData.get('stripeCustomerId') as string | null
  const stripePriceId = formData.get('stripePriceId') as string | null

  if (!clientId || !plan) {
    return { error: 'Client and plan are required' }
  }

  if (!['ESSENTIALS', 'GROWTH', 'PARTNER'].includes(plan)) {
    return { error: 'Invalid plan' }
  }

  // Check client exists
  const client = await prisma.clients.findUnique({ where: { id: clientId } })
  if (!client) {
    return { error: 'Client not found' }
  }

  // Check no existing active subscription
  const existing = await prisma.care_subscriptions.findUnique({
    where: { clientId },
  })
  if (existing && existing.status === 'ACTIVE') {
    return { error: 'Client already has an active Care subscription' }
  }

  const credits = getPlanCredits(plan)
  const now = new Date()
  const periodEnd = new Date(now)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  try {
    // Create subscription
    const subscription = await prisma.care_subscriptions.create({
      data: {
        clientId,
        plan,
        status: 'ACTIVE',
        creditsPerMonth: credits,
        stripeSubscriptionId: stripeSubscriptionId || null,
        stripeCustomerId: stripeCustomerId || null,
        stripePriceId: stripePriceId || null,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
    })

    // Allocate first credit lot
    await allocateLot({
      subscriptionId: subscription.id,
      credits,
      periodStart: now,
      periodEnd,
      actorId: session.user.id,
    })

    revalidatePath('/dashboard/care')
    revalidatePath(`/dashboard/clients/${clientId}`)
    return { success: true, data: { subscriptionId: subscription.id } }
  } catch (err) {
    console.error('Failed to create Care subscription:', err)
    return { error: 'Failed to create subscription' }
  }
}

/**
 * Update a Care subscription (plan change, pause, cancel).
 */
export async function updateCareSubscription(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const subscriptionId = formData.get('subscriptionId') as string
  const action = formData.get('action') as string // 'pause' | 'resume' | 'cancel' | 'change_plan'

  if (!subscriptionId || !action) {
    return { error: 'Subscription ID and action are required' }
  }

  const subscription = await prisma.care_subscriptions.findUnique({
    where: { id: subscriptionId },
  })
  if (!subscription) {
    return { error: 'Subscription not found' }
  }

  try {
    switch (action) {
      case 'pause':
        await prisma.care_subscriptions.update({
          where: { id: subscriptionId },
          data: { status: 'PAUSED', pausedAt: new Date() },
        })
        break

      case 'resume':
        await prisma.care_subscriptions.update({
          where: { id: subscriptionId },
          data: { status: 'ACTIVE', pausedAt: null },
        })
        break

      case 'cancel':
        await prisma.care_subscriptions.update({
          where: { id: subscriptionId },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        })
        break

      case 'change_plan': {
        const newPlan = formData.get('newPlan') as CarePlan
        if (!newPlan || !['ESSENTIALS', 'GROWTH', 'PARTNER'].includes(newPlan)) {
          return { error: 'Invalid new plan' }
        }
        const newCredits = getPlanCredits(newPlan)
        await prisma.care_subscriptions.update({
          where: { id: subscriptionId },
          data: { plan: newPlan, creditsPerMonth: newCredits },
        })
        break
      }

      default:
        return { error: 'Invalid action' }
    }

    revalidatePath('/dashboard/care')
    return { success: true }
  } catch (err) {
    console.error('Failed to update Care subscription:', err)
    return { error: 'Failed to update subscription' }
  }
}

// ============================================
// TICKET MANAGEMENT
// ============================================

/**
 * Submit a new Care ticket (client action).
 * Does NOT charge credits — that happens during admin triage.
 */
export async function submitCareTicket(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!title?.trim() || !description?.trim()) {
    return { error: 'Title and description are required' }
  }

  if (title.length > 200) {
    return { error: 'Title must be 200 characters or less' }
  }

  if (description.length > 5000) {
    return { error: 'Description must be 5,000 characters or less' }
  }

  // Find client's active subscription
  const client = await prisma.clients.findUnique({
    where: { userId: session.user.id },
    include: {
      careSubscription: true,
    },
  })

  if (!client?.careSubscription) {
    return { error: 'No active Care subscription found' }
  }

  if (client.careSubscription.status !== 'ACTIVE') {
    return { error: 'Your Care subscription is not active' }
  }

  try {
    const ticket = await prisma.care_tickets.create({
      data: {
        subscriptionId: client.careSubscription.id,
        requesterId: session.user.id,
        title: title.trim(),
        description: description.trim(),
        status: 'SUBMITTED',
        priority: 'NORMAL',
      },
    })

    revalidatePath('/portal/care')
    revalidatePath('/dashboard/care')
    return { success: true, data: { ticketId: ticket.id } }
  } catch (err) {
    console.error('Failed to submit Care ticket:', err)
    return { error: 'Failed to submit request' }
  }
}

/**
 * Triage a Care ticket (admin action).
 * Sets credit size, charges credits via FIFO, and moves to TRIAGED status.
 */
export async function triageCareTicket(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const ticketId = formData.get('ticketId') as string
  const creditSize = formData.get('creditSize') as CareCreditSize
  const priority = formData.get('priority') as string | null
  const internalNotes = formData.get('internalNotes') as string | null

  if (!ticketId || !creditSize) {
    return { error: 'Ticket ID and credit size are required' }
  }

  if (!['MICRO', 'STANDARD', 'ADVANCED'].includes(creditSize)) {
    return { error: 'Invalid credit size' }
  }

  const ticket = await prisma.care_tickets.findUnique({
    where: { id: ticketId },
    include: { subscription: true },
  })

  if (!ticket) {
    return { error: 'Ticket not found' }
  }

  if (ticket.status !== 'SUBMITTED') {
    return { error: 'Ticket has already been triaged' }
  }

  const creditCost = getCreditCost(creditSize)

  try {
    // Spend credits FIFO
    await spendCredits({
      subscriptionId: ticket.subscriptionId,
      amount: creditCost,
      ticketId: ticket.id,
      actorId: session.user.id,
      reason: `Ticket triage: ${ticket.title} (${creditSize} = ${creditCost} credits)`,
    })

    // Update ticket status
    await prisma.care_tickets.update({
      where: { id: ticketId },
      data: {
        status: 'TRIAGED',
        creditSize,
        creditsCharged: creditCost,
        priority: priority && ['LOW', 'NORMAL', 'HIGH', 'URGENT'].includes(priority)
          ? (priority as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT')
          : undefined,
        internalNotes: internalNotes || undefined,
        triagedAt: new Date(),
      },
    })

    revalidatePath('/dashboard/care')
    revalidatePath('/portal/care')
    return { success: true }
  } catch (err) {
    if (err instanceof Error && err.message.includes('Insufficient credits')) {
      return { error: err.message }
    }
    console.error('Failed to triage Care ticket:', err)
    return { error: 'Failed to triage ticket' }
  }
}

/**
 * Update ticket status (admin action).
 * Handles transitions: TRIAGED → IN_PROGRESS → IN_REVIEW → COMPLETED
 */
export async function updateCareTicketStatus(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const ticketId = formData.get('ticketId') as string
  const newStatus = formData.get('status') as string

  if (!ticketId || !newStatus) {
    return { error: 'Ticket ID and status are required' }
  }

  const validStatuses = ['IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']
  if (!validStatuses.includes(newStatus)) {
    return { error: 'Invalid status' }
  }

  const ticket = await prisma.care_tickets.findUnique({
    where: { id: ticketId },
  })

  if (!ticket) {
    return { error: 'Ticket not found' }
  }

  try {
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (newStatus === 'IN_PROGRESS') {
      updateData.startedAt = new Date()
    } else if (newStatus === 'COMPLETED') {
      updateData.completedAt = new Date()
    } else if (newStatus === 'CANCELLED') {
      updateData.cancelledAt = new Date()

      // Refund credits if ticket was triaged (credits were charged)
      if (ticket.creditsCharged > 0) {
        await refundCredits({
          subscriptionId: ticket.subscriptionId,
          ticketId: ticket.id,
          actorId: session.user.id,
          reason: 'Ticket cancelled by admin',
        })
      }
    }

    await prisma.care_tickets.update({
      where: { id: ticketId },
      data: updateData,
    })

    revalidatePath('/dashboard/care')
    revalidatePath('/portal/care')
    return { success: true }
  } catch (err) {
    console.error('Failed to update Care ticket status:', err)
    return { error: 'Failed to update ticket' }
  }
}

/**
 * Add an update/comment to a Care ticket.
 * Both clients and admins can post updates.
 */
export async function addCareTicketUpdate(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user) {
    return { error: 'Unauthorized' }
  }

  const ticketId = formData.get('ticketId') as string
  const content = formData.get('content') as string
  const isInternal = formData.get('isInternal') === 'true'

  if (!ticketId || !content?.trim()) {
    return { error: 'Ticket ID and content are required' }
  }

  if (content.length > 5000) {
    return { error: 'Update must be 5,000 characters or less' }
  }

  // Only admins can post internal notes
  if (isInternal && session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Only admins can post internal notes' }
  }

  // Verify the ticket exists and the user has access
  const ticket = await prisma.care_tickets.findUnique({
    where: { id: ticketId },
    include: { subscription: { include: { client: true } } },
  })

  if (!ticket) {
    return { error: 'Ticket not found' }
  }

  // Clients can only update their own tickets
  if (session.user.role === 'CLIENT' && ticket.requesterId !== session.user.id) {
    return { error: 'Unauthorized' }
  }

  try {
    await prisma.care_ticket_updates.create({
      data: {
        ticketId,
        authorId: session.user.id,
        content: content.trim(),
        isInternal,
      },
    })

    revalidatePath('/dashboard/care')
    revalidatePath('/portal/care')
    return { success: true }
  } catch (err) {
    console.error('Failed to add Care ticket update:', err)
    return { error: 'Failed to add update' }
  }
}

// ============================================
// ADMIN CREDIT ADJUSTMENTS
// ============================================

/**
 * Manual credit adjustment (admin only).
 * Used for goodwill credits, corrections, etc.
 */
export async function adminCreditAdjustment(
  prevState: CareActionState,
  formData: FormData
): Promise<CareActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const subscriptionId = formData.get('subscriptionId') as string
  const deltaStr = formData.get('delta') as string
  const reason = formData.get('reason') as string

  if (!subscriptionId || !deltaStr || !reason?.trim()) {
    return { error: 'Subscription ID, delta, and reason are required' }
  }

  const delta = parseInt(deltaStr, 10)
  if (isNaN(delta) || delta === 0) {
    return { error: 'Delta must be a non-zero integer' }
  }

  // Verify subscription exists
  const subscription = await prisma.care_subscriptions.findUnique({
    where: { id: subscriptionId },
  })
  if (!subscription) {
    return { error: 'Subscription not found' }
  }

  try {
    await adjustCredits({
      subscriptionId,
      delta,
      reason: reason.trim(),
      actorId: session.user.id,
    })

    revalidatePath('/dashboard/care')
    revalidatePath('/portal/care')
    return { success: true }
  } catch (err) {
    console.error('Failed to adjust credits:', err)
    return { error: 'Failed to adjust credits' }
  }
}
