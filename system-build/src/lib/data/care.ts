/**
 * Care System Data Queries
 *
 * Read-only queries for the Care system, used by both the
 * admin dashboard and client portal pages.
 */

import { prisma } from '@/lib/prisma'
import { getBalanceSummary, getActiveLots } from '@/lib/care-credits'
import type { CareTicketStatus } from '@prisma/client'

// ============================================
// DASHBOARD (Admin) QUERIES
// ============================================

/**
 * Get all Care subscriptions with client info and balance summaries.
 * Used by the dashboard Care overview page.
 */
export async function getAllCareSubscriptions() {
  const subscriptions = await prisma.care_subscriptions.findMany({
    include: {
      client: {
        select: {
          id: true,
          contactName: true,
          contactEmail: true,
          companyName: true,
        },
      },
      _count: {
        select: {
          tickets: {
            where: {
              status: { in: ['SUBMITTED', 'TRIAGED', 'IN_PROGRESS', 'IN_REVIEW'] },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Enrich with balance summaries
  const enriched = await Promise.all(
    subscriptions.map(async (sub) => {
      const balance = await getBalanceSummary(sub.id)
      return {
        ...sub,
        balance,
      }
    })
  )

  return enriched
}

/**
 * Get a single Care subscription with full details.
 */
export async function getCareSubscription(subscriptionId: string) {
  const subscription = await prisma.care_subscriptions.findUnique({
    where: { id: subscriptionId },
    include: {
      client: {
        select: {
          id: true,
          contactName: true,
          contactEmail: true,
          companyName: true,
          phone: true,
        },
      },
    },
  })

  if (!subscription) return null

  const [balance, lots] = await Promise.all([
    getBalanceSummary(subscription.id),
    getActiveLots(subscription.id),
  ])

  return {
    ...subscription,
    balance,
    activeLots: lots,
  }
}

/**
 * Get the Care ticket queue for admin dashboard.
 * Returns tickets grouped by status with pagination.
 */
export async function getCareTicketQueue(params?: {
  status?: CareTicketStatus[]
  limit?: number
  offset?: number
}) {
  const { status, limit = 50, offset = 0 } = params ?? {}

  const where = status ? { status: { in: status } } : {}

  const [tickets, total] = await Promise.all([
    prisma.care_tickets.findMany({
      where,
      include: {
        subscription: {
          select: {
            plan: true,
            client: {
              select: {
                contactName: true,
                companyName: true,
                contactEmail: true,
              },
            },
          },
        },
        requester: {
          select: { name: true, email: true },
        },
        _count: {
          select: { updates: true },
        },
      },
      orderBy: [
        { priority: 'desc' },
        { submittedAt: 'asc' },
      ],
      take: limit,
      skip: offset,
    }),
    prisma.care_tickets.count({ where }),
  ])

  return { tickets, total }
}

/**
 * Get a single Care ticket with full thread.
 */
export async function getCareTicket(ticketId: string) {
  return prisma.care_tickets.findUnique({
    where: { id: ticketId },
    include: {
      subscription: {
        select: {
          plan: true,
          status: true,
          client: {
            select: {
              id: true,
              contactName: true,
              companyName: true,
              contactEmail: true,
            },
          },
        },
      },
      requester: {
        select: { name: true, email: true },
      },
      updates: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { name: true, email: true, role: true },
          },
        },
      },
      ledgerEntries: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          delta: true,
          type: true,
          reason: true,
          createdAt: true,
        },
      },
    },
  })
}

/**
 * Get credit ledger history for a subscription.
 * Used in admin subscription detail page.
 */
export async function getCreditLedger(subscriptionId: string, limit = 100) {
  return prisma.care_credit_ledger.findMany({
    where: { subscriptionId },
    include: {
      lot: {
        select: { periodStart: true, expiresAt: true, isExpired: true },
      },
      ticket: {
        select: { id: true, title: true, creditSize: true },
      },
      actor: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
}

/**
 * Get dashboard stats for the Care overview page.
 */
export async function getCareStats() {
  const [
    activeSubscriptions,
    totalSubscriptions,
    submittedTickets,
    inProgressTickets,
    completedThisMonth,
  ] = await Promise.all([
    prisma.care_subscriptions.count({ where: { status: 'ACTIVE' } }),
    prisma.care_subscriptions.count(),
    prisma.care_tickets.count({ where: { status: 'SUBMITTED' } }),
    prisma.care_tickets.count({ where: { status: { in: ['TRIAGED', 'IN_PROGRESS'] } } }),
    prisma.care_tickets.count({
      where: {
        status: 'COMPLETED',
        completedAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    }),
  ])

  return {
    activeSubscriptions,
    totalSubscriptions,
    submittedTickets,
    inProgressTickets,
    completedThisMonth,
  }
}

// ============================================
// PORTAL (Client) QUERIES
// ============================================

/**
 * Get a client's Care subscription with balance and recent tickets.
 * Used by the client portal Care home page.
 */
export async function getClientCareHome(userId: string) {
  const client = await prisma.clients.findUnique({
    where: { userId },
    include: {
      careSubscription: true,
    },
  })

  if (!client?.careSubscription) {
    return null
  }

  const sub = client.careSubscription

  const [balance, recentTickets, lots] = await Promise.all([
    getBalanceSummary(sub.id),
    prisma.care_tickets.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { submittedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        title: true,
        status: true,
        creditSize: true,
        creditsCharged: true,
        submittedAt: true,
        completedAt: true,
        priority: true,
      },
    }),
    getActiveLots(sub.id),
  ])

  return {
    subscription: sub,
    balance,
    recentTickets,
    activeLots: lots,
    client: {
      contactName: client.contactName,
      companyName: client.companyName,
    },
  }
}

/**
 * Get a client's tickets with pagination.
 * Used by the client portal tickets list page.
 */
export async function getClientTickets(userId: string, params?: {
  limit?: number
  offset?: number
}) {
  const { limit = 20, offset = 0 } = params ?? {}

  const client = await prisma.clients.findUnique({
    where: { userId },
    include: { careSubscription: { select: { id: true } } },
  })

  if (!client?.careSubscription) {
    return { tickets: [], total: 0 }
  }

  const subscriptionId = client.careSubscription.id

  const [tickets, total] = await Promise.all([
    prisma.care_tickets.findMany({
      where: { subscriptionId },
      orderBy: { submittedAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        _count: { select: { updates: { where: { isInternal: false } } } },
      },
    }),
    prisma.care_tickets.count({ where: { subscriptionId } }),
  ])

  return { tickets, total }
}

/**
 * Get a client's ticket detail (excludes internal notes/updates).
 */
export async function getClientTicketDetail(userId: string, ticketId: string) {
  const client = await prisma.clients.findUnique({
    where: { userId },
    include: { careSubscription: { select: { id: true } } },
  })

  if (!client?.careSubscription) return null

  const ticket = await prisma.care_tickets.findUnique({
    where: { id: ticketId },
    include: {
      updates: {
        where: { isInternal: false }, // Hide internal notes from client
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: { name: true, role: true },
          },
        },
      },
    },
  })

  // Verify ticket belongs to client's subscription
  if (!ticket || ticket.subscriptionId !== client.careSubscription.id) {
    return null
  }

  return ticket
}
