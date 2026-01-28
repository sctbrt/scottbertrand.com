// Lead Data Access Layer
// Handles encryption/decryption of sensitive lead data

import { prisma } from '@/lib/prisma'
import { safeDecrypt, isEncryptionConfigured } from '@/lib/encryption'
import type { LeadStatus, Prisma } from '@prisma/client'

// Fields that are encrypted and need decryption
const ENCRYPTED_FIELDS = ['email', 'phone', 'message'] as const

/**
 * Decrypt sensitive fields in a lead record
 * Works with any lead object (with or without relations)
 */
export function decryptLeadFields<T extends { email?: string | null; phone?: string | null; message?: string | null }>(lead: T): T {
  if (!lead) return lead

  const decrypted = { ...lead }

  if (decrypted.email && typeof decrypted.email === 'string') {
    decrypted.email = safeDecrypt(decrypted.email)
  }
  if (decrypted.phone && typeof decrypted.phone === 'string') {
    decrypted.phone = safeDecrypt(decrypted.phone)
  }
  if (decrypted.message && typeof decrypted.message === 'string') {
    decrypted.message = safeDecrypt(decrypted.message)
  }

  return decrypted
}

/**
 * Decrypt an array of leads
 */
export function decryptLeadArray<T extends { email?: string | null; phone?: string | null; message?: string | null }>(leads: T[]): T[] {
  return leads.map(decryptLeadFields)
}

// Type for full lead with all relations
export type LeadWithRelations = Prisma.leadsGetPayload<{
  include: {
    service_templates: true
    clients: {
      include: {
        users: { select: { email: true } }
      }
    }
    users: { select: { name: true; email: true } }
  }
}>

// Type for lead list item (with service template)
export type LeadListItem = Prisma.leadsGetPayload<{
  include: { service_templates: { select: { name: true } } }
}>

/**
 * Fetch leads with decryption - use this instead of direct prisma.leads.findMany
 * Returns leads with service_templates included
 */
export async function getLeads(options?: {
  where?: Prisma.leadsWhereInput
  orderBy?: Prisma.leadsOrderByWithRelationInput | Prisma.leadsOrderByWithRelationInput[]
  skip?: number
  take?: number
}): Promise<LeadListItem[]> {
  const leads = await prisma.leads.findMany({
    ...options,
    include: {
      service_templates: {
        select: { name: true },
      },
    },
  })
  return decryptLeadArray(leads)
}

/**
 * Fetch a single lead with decryption and full relations
 */
export async function getLead(id: string): Promise<LeadWithRelations | null> {
  const lead = await prisma.leads.findUnique({
    where: { id },
    include: {
      service_templates: true,
      clients: {
        include: {
          users: { select: { email: true } },
        },
      },
      users: {
        select: { name: true, email: true },
      },
    },
  })
  return lead ? decryptLeadFields(lead) : null
}

/**
 * Count leads (no decryption needed)
 */
export async function countLeads(where?: Prisma.leadsWhereInput) {
  return prisma.leads.count({ where })
}

/**
 * Group leads by status (no decryption needed)
 */
export async function groupLeadsByStatus() {
  return prisma.leads.groupBy({
    by: ['status'],
    _count: { id: true },
  })
}

/**
 * Search leads by email (handles encrypted emails)
 * Note: This requires a special approach since we can't search encrypted data directly
 * For now, we decrypt after fetching - for large datasets, consider a searchable hash index
 */
export async function searchLeadsByEmail(
  emailQuery: string,
  options?: {
    status?: LeadStatus
    limit?: number
  }
): Promise<LeadListItem[]> {
  // For encrypted data, we need to fetch all and filter client-side
  // This is inefficient for large datasets - consider adding an email hash column for searching
  const leads = await prisma.leads.findMany({
    where: options?.status ? { status: options.status } : undefined,
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 100,
    include: {
      service_templates: {
        select: { name: true },
      },
    },
  })

  const decryptedLeads = decryptLeadArray(leads)

  // Filter by email after decryption
  const normalizedQuery = emailQuery.toLowerCase()
  return decryptedLeads.filter(lead =>
    lead.email.toLowerCase().includes(normalizedQuery)
  )
}

/**
 * Check if encryption is enabled
 */
export function isLeadEncryptionEnabled(): boolean {
  return isEncryptionConfigured()
}
