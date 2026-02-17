/**
 * Care Credit Engine
 *
 * Core business logic for the B Care subscription credit system.
 * Handles lot creation, FIFO credit spending, expiry sweeps, balance computation,
 * and all ledger operations. Every credit movement creates an append-only ledger entry.
 *
 * Key invariants:
 * - Balance = SUM(delta) from care_credit_ledger for a subscription
 * - Credits are consumed FIFO (oldest non-expired lot first)
 * - Ledger entries are never updated or deleted
 * - Lots track their own remaining count for efficient FIFO queries
 */

import { prisma } from './prisma'
import type {
  CarePlan,
  CareCreditSize,
  CareLedgerType,
  CareTicketStatus,
} from '@prisma/client'

// ============================================
// CONSTANTS
// ============================================

/** Credits allocated per plan tier per month */
export const PLAN_CREDITS: Record<CarePlan, number> = {
  ESSENTIALS: 4,
  GROWTH: 10,
  PARTNER: 24,
}

/** Credit cost per ticket size */
export const SIZE_CREDITS: Record<CareCreditSize, number> = {
  MICRO: 1,
  STANDARD: 2,
  ADVANCED: 4,
}

/** How long credits remain valid after their lot's period ends (in months) */
export const CREDIT_EXPIRY_MONTHS = 1

// ============================================
// BALANCE & QUERIES
// ============================================

/**
 * Get the current credit balance for a subscription.
 * Computed from the append-only ledger (source of truth).
 */
export async function getBalance(subscriptionId: string): Promise<number> {
  const result = await prisma.care_credit_ledger.aggregate({
    where: { subscriptionId },
    _sum: { delta: true },
  })
  return result._sum.delta ?? 0
}

/**
 * Get available credits (from non-expired lots with remaining > 0).
 * This is the "spendable" balance — may differ from ledger balance
 * if there are pending expiry sweeps.
 */
export async function getAvailableCredits(subscriptionId: string): Promise<number> {
  const result = await prisma.care_credit_lots.aggregate({
    where: {
      subscriptionId,
      isExpired: false,
      remaining: { gt: 0 },
      expiresAt: { gt: new Date() },
    },
    _sum: { remaining: true },
  })
  return result._sum.remaining ?? 0
}

/**
 * Get credit balance breakdown: total, available, pending expiry.
 */
export async function getBalanceSummary(subscriptionId: string) {
  const [ledgerBalance, availableCredits, subscription] = await Promise.all([
    getBalance(subscriptionId),
    getAvailableCredits(subscriptionId),
    prisma.care_subscriptions.findUnique({
      where: { id: subscriptionId },
      select: {
        plan: true,
        creditsPerMonth: true,
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
      },
    }),
  ])

  return {
    ledgerBalance,
    availableCredits,
    plan: subscription?.plan ?? null,
    creditsPerMonth: subscription?.creditsPerMonth ?? 0,
    status: subscription?.status ?? null,
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  }
}

/**
 * Get active lots ordered by expiry (FIFO — oldest first).
 */
export async function getActiveLots(subscriptionId: string) {
  return prisma.care_credit_lots.findMany({
    where: {
      subscriptionId,
      isExpired: false,
      remaining: { gt: 0 },
      expiresAt: { gt: new Date() },
    },
    orderBy: { expiresAt: 'asc' },
  })
}

// ============================================
// LOT CREATION (Monthly Allocation)
// ============================================

/**
 * Allocate a new credit lot for a billing cycle.
 * Called when a subscription renews (Stripe webhook or manual).
 * Creates both the lot and a ledger ALLOCATION entry.
 */
export async function allocateLot(params: {
  subscriptionId: string
  credits: number
  periodStart: Date
  periodEnd: Date
  actorId?: string
}) {
  const { subscriptionId, credits, periodStart, periodEnd, actorId } = params

  // Lot expires CREDIT_EXPIRY_MONTHS after the period ends
  const expiresAt = new Date(periodEnd)
  expiresAt.setMonth(expiresAt.getMonth() + CREDIT_EXPIRY_MONTHS)

  return prisma.$transaction(async (tx) => {
    // Create the lot
    const lot = await tx.care_credit_lots.create({
      data: {
        subscriptionId,
        allocated: credits,
        remaining: credits,
        periodStart,
        expiresAt,
      },
    })

    // Create ledger entry
    await tx.care_credit_ledger.create({
      data: {
        subscriptionId,
        lotId: lot.id,
        delta: credits,
        type: 'ALLOCATION',
        reason: `Monthly allocation (${credits} credits)`,
        actorId,
      },
    })

    return lot
  })
}

// ============================================
// FIFO CREDIT SPENDING
// ============================================

/**
 * Spend credits from the oldest active lots (FIFO).
 * Returns the ledger entries created, or throws if insufficient credits.
 *
 * @param subscriptionId - The subscription to debit
 * @param amount - Number of credits to spend
 * @param ticketId - The ticket consuming credits
 * @param actorId - Who triggered the spend (admin who triaged)
 * @param reason - Human-readable reason
 */
export async function spendCredits(params: {
  subscriptionId: string
  amount: number
  ticketId: string
  actorId?: string
  reason?: string
}) {
  const { subscriptionId, amount, ticketId, actorId, reason } = params

  if (amount <= 0) {
    throw new Error('Credit spend amount must be positive')
  }

  return prisma.$transaction(async (tx) => {
    // Get active lots, oldest first (FIFO)
    const lots = await tx.care_credit_lots.findMany({
      where: {
        subscriptionId,
        isExpired: false,
        remaining: { gt: 0 },
        expiresAt: { gt: new Date() },
      },
      orderBy: { expiresAt: 'asc' },
    })

    // Check total available
    const totalAvailable = lots.reduce((sum, lot) => sum + lot.remaining, 0)
    if (totalAvailable < amount) {
      throw new Error(
        `Insufficient credits: need ${amount}, have ${totalAvailable} available`
      )
    }

    // Consume from lots FIFO
    let remaining = amount
    const ledgerEntries = []

    for (const lot of lots) {
      if (remaining <= 0) break

      const consume = Math.min(remaining, lot.remaining)

      // Decrement lot
      await tx.care_credit_lots.update({
        where: { id: lot.id },
        data: { remaining: lot.remaining - consume },
      })

      // Create ledger entry for this lot's contribution
      const entry = await tx.care_credit_ledger.create({
        data: {
          subscriptionId,
          lotId: lot.id,
          ticketId,
          delta: -consume,
          type: 'SPEND',
          reason: reason ?? `Ticket credit spend (${consume} from lot)`,
          actorId,
        },
      })

      ledgerEntries.push(entry)
      remaining -= consume
    }

    return ledgerEntries
  })
}

/**
 * Refund credits back to the most recently consumed lot for a ticket.
 * Used when a ticket is cancelled after triage.
 */
export async function refundCredits(params: {
  subscriptionId: string
  ticketId: string
  actorId?: string
  reason?: string
}) {
  const { subscriptionId, ticketId, actorId, reason } = params

  return prisma.$transaction(async (tx) => {
    // Find all SPEND entries for this ticket
    const spendEntries = await tx.care_credit_ledger.findMany({
      where: {
        subscriptionId,
        ticketId,
        type: 'SPEND',
      },
      include: { lot: true },
    })

    if (spendEntries.length === 0) {
      return [] // Nothing to refund
    }

    const ledgerEntries = []

    for (const entry of spendEntries) {
      const refundAmount = Math.abs(entry.delta) // SPEND entries are negative

      // Restore credits to the lot (if not expired)
      if (entry.lot && !entry.lot.isExpired) {
        await tx.care_credit_lots.update({
          where: { id: entry.lot.id },
          data: { remaining: entry.lot.remaining + refundAmount },
        })
      }

      // Create refund ledger entry
      const refund = await tx.care_credit_ledger.create({
        data: {
          subscriptionId,
          lotId: entry.lotId,
          ticketId,
          delta: refundAmount, // Positive = credit restored
          type: 'ADJUSTMENT',
          reason: reason ?? `Refund: ticket cancelled (${refundAmount} credits restored)`,
          actorId,
        },
      })

      ledgerEntries.push(refund)
    }

    return ledgerEntries
  })
}

// ============================================
// EXPIRY SWEEP (Cron Job)
// ============================================

/**
 * Expire all lots past their expiry date.
 * Creates EXPIRY ledger entries for forfeited credits.
 * Should be called by a daily cron job.
 *
 * @returns Number of lots expired and total credits forfeited
 */
export async function sweepExpiredLots(): Promise<{
  lotsExpired: number
  creditsForfeited: number
}> {
  const now = new Date()

  // Find all non-expired lots that should be expired
  const expiredLots = await prisma.care_credit_lots.findMany({
    where: {
      isExpired: false,
      expiresAt: { lte: now },
      remaining: { gt: 0 },
    },
  })

  if (expiredLots.length === 0) {
    return { lotsExpired: 0, creditsForfeited: 0 }
  }

  let totalForfeited = 0

  // Process each lot in a transaction
  await prisma.$transaction(async (tx) => {
    for (const lot of expiredLots) {
      totalForfeited += lot.remaining

      // Mark lot as expired
      await tx.care_credit_lots.update({
        where: { id: lot.id },
        data: { isExpired: true, remaining: 0 },
      })

      // Create EXPIRY ledger entry
      await tx.care_credit_ledger.create({
        data: {
          subscriptionId: lot.subscriptionId,
          lotId: lot.id,
          delta: -lot.remaining,
          type: 'EXPIRY',
          reason: `Expired unused credits (${lot.remaining} forfeited)`,
        },
      })
    }
  })

  // Also mark lots with 0 remaining as expired (cleanup)
  await prisma.care_credit_lots.updateMany({
    where: {
      isExpired: false,
      expiresAt: { lte: now },
      remaining: 0,
    },
    data: { isExpired: true },
  })

  return { lotsExpired: expiredLots.length, creditsForfeited: totalForfeited }
}

// ============================================
// ADMIN ADJUSTMENTS
// ============================================

/**
 * Manual credit adjustment by admin.
 * Positive delta = add credits, negative delta = deduct credits.
 * Does NOT affect lots — adjustments are ledger-only.
 */
export async function adjustCredits(params: {
  subscriptionId: string
  delta: number
  reason: string
  actorId: string
}) {
  const { subscriptionId, delta, reason, actorId } = params

  if (delta === 0) {
    throw new Error('Adjustment delta cannot be zero')
  }

  return prisma.care_credit_ledger.create({
    data: {
      subscriptionId,
      delta,
      type: 'ADJUSTMENT',
      reason,
      actorId,
    },
  })
}

// ============================================
// SUBSCRIPTION HELPERS
// ============================================

/**
 * Check if a subscription has enough credits for a given ticket size.
 */
export async function canAfford(
  subscriptionId: string,
  size: CareCreditSize
): Promise<boolean> {
  const cost = SIZE_CREDITS[size]
  const available = await getAvailableCredits(subscriptionId)
  return available >= cost
}

/**
 * Get the credit cost for a ticket size.
 */
export function getCreditCost(size: CareCreditSize): number {
  return SIZE_CREDITS[size]
}

/**
 * Get credits allocated per month for a plan.
 */
export function getPlanCredits(plan: CarePlan): number {
  return PLAN_CREDITS[plan]
}
