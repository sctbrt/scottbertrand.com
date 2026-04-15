// Portal labels — single source of truth for enum → client-facing copy
//
// Rule: never interpolate a raw Prisma enum into portal JSX. Route every
// client-visible status/state/plan/size through labelFor(). This lets us
// keep tone consistent, swap wording in one place, and never leak backend
// taxonomy ("TRIAGED", "ESSENTIALS", "PENDING_APPROVAL") into the UI.
//
// Tone drives badge styling — status is never color-only. The matching
// StatusPill component combines an icon + text + aria-label so the state
// is legible to colorblind and screen-reader users.

import type {
  PortalStage,
  PaymentStatus,
  DeliverableState,
  InvoiceStatus,
  CareTicketStatus,
  CarePlan,
  CareCreditSize,
  FeedbackType,
  SignoffAction,
  ProjectStatus,
} from '@prisma/client'

export type LabelTone =
  | 'neutral' // steady, no signal
  | 'active' // in-flight work
  | 'action' // client needs to do something
  | 'positive' // done / paid / released
  | 'warning' // past due / attention needed

export interface PortalLabel {
  /** Client-facing copy. Plain language, never a raw enum. */
  text: string
  /** Styling + icon hint. Screen-reader-safe: never rely on color alone. */
  tone: LabelTone
  /** Optional override for aria-label. Defaults to `text`. */
  srLabel?: string
}

// ---------------------------------------------------------------------------
// Project — PortalStage (canonical client-facing stage, per §13 spec)
// ---------------------------------------------------------------------------
const portalStageLabels: Record<PortalStage, PortalLabel> = {
  SCHEDULED: { text: 'Scheduled', tone: 'neutral' },
  IN_DELIVERY: { text: 'In progress', tone: 'active' },
  IN_REVIEW: { text: 'Ready for your review', tone: 'action' },
  APPROVED: { text: 'Approved — preparing release', tone: 'active' },
  RELEASED: { text: 'Released', tone: 'positive' },
  COMPLETE: { text: 'Complete', tone: 'positive' },
}

// ---------------------------------------------------------------------------
// Project — PaymentStatus
// ---------------------------------------------------------------------------
const paymentStatusLabels: Record<PaymentStatus, PortalLabel> = {
  UNPAID: { text: 'Payment pending', tone: 'action' },
  PAID: { text: 'Paid', tone: 'positive' },
  PARTIALLY_REFUNDED: { text: 'Partially refunded', tone: 'neutral' },
  REFUNDED: { text: 'Refunded', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Deliverable — state
// ---------------------------------------------------------------------------
const deliverableStateLabels: Record<DeliverableState, PortalLabel> = {
  DRAFT: { text: 'Working draft', tone: 'neutral' },
  REVIEW: { text: 'For your review', tone: 'action' },
  FINAL: { text: 'Final', tone: 'positive' },
}

// ---------------------------------------------------------------------------
// Invoice — status
// ---------------------------------------------------------------------------
// DRAFT is deliberately absent — draft invoices are never shown to clients.
const invoiceStatusLabels: Record<Exclude<InvoiceStatus, 'DRAFT'>, PortalLabel> = {
  SENT: { text: 'Ready to pay', tone: 'action' },
  VIEWED: { text: 'Ready to pay', tone: 'action' },
  PAID: { text: 'Paid', tone: 'positive' },
  OVERDUE: { text: 'Past due', tone: 'warning' },
  CANCELLED: { text: 'Cancelled', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Care — ticket status
// ---------------------------------------------------------------------------
const careTicketStatusLabels: Record<CareTicketStatus, PortalLabel> = {
  SUBMITTED: { text: 'Received', tone: 'neutral' },
  TRIAGED: { text: 'Accepted', tone: 'active' },
  IN_PROGRESS: { text: 'In progress', tone: 'active' },
  IN_REVIEW: { text: 'Ready for your review', tone: 'action' },
  COMPLETED: { text: 'Completed', tone: 'positive' },
  CANCELLED: { text: 'Cancelled', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Care — plan tier (client-facing display-only names)
// ---------------------------------------------------------------------------
const carePlanLabels: Record<CarePlan, PortalLabel> = {
  ESSENTIALS: { text: 'Bronze', tone: 'neutral' },
  GROWTH: { text: 'Silver', tone: 'neutral' },
  PARTNER: { text: 'Gold', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Care — credit size (mapping the task size to a human explanation)
// ---------------------------------------------------------------------------
const careCreditSizeLabels: Record<CareCreditSize, PortalLabel> = {
  MICRO: { text: 'Quick fix (1 credit)', tone: 'neutral' },
  STANDARD: { text: 'Standard change (2 credits)', tone: 'neutral' },
  ADVANCED: { text: 'Larger change (4 credits)', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Feedback — past-tense state labels (for history rows).
// For present-tense action labels (buttons), the FeedbackForm owns its own
// copy because button voice differs from log voice.
// ---------------------------------------------------------------------------
const feedbackTypeLabels: Record<FeedbackType, PortalLabel> = {
  APPROVE: { text: 'Approved', tone: 'positive' },
  APPROVE_MINOR: { text: 'Approved with minor notes', tone: 'positive' },
  NEEDS_REVISION: { text: 'Revision requested', tone: 'action' },
}

// ---------------------------------------------------------------------------
// Signoff — action (past tense)
// ---------------------------------------------------------------------------
const signoffActionLabels: Record<SignoffAction, PortalLabel> = {
  APPROVED_AND_RELEASED: { text: 'Approved & released', tone: 'positive' },
  SIGNED_OFF: { text: 'Signed off', tone: 'positive' },
}

// ---------------------------------------------------------------------------
// ProjectStatus — legacy bridge. `/portal` list still uses this; prefer
// PortalStage for the Delivery Room. Kept for the transitional period
// until the list swap lands.
// ---------------------------------------------------------------------------
const projectStatusLabels: Record<ProjectStatus, PortalLabel> = {
  DRAFT: { text: 'Not started', tone: 'neutral' },
  PENDING_APPROVAL: { text: 'Waiting on your approval', tone: 'action' },
  IN_PROGRESS: { text: 'In progress', tone: 'active' },
  ON_HOLD: { text: 'On hold', tone: 'neutral' },
  COMPLETED: { text: 'Complete', tone: 'positive' },
  CANCELLED: { text: 'Cancelled', tone: 'neutral' },
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
type LabelMap = {
  PortalStage: typeof portalStageLabels
  PaymentStatus: typeof paymentStatusLabels
  DeliverableState: typeof deliverableStateLabels
  InvoiceStatus: typeof invoiceStatusLabels
  CareTicketStatus: typeof careTicketStatusLabels
  CarePlan: typeof carePlanLabels
  CareCreditSize: typeof careCreditSizeLabels
  FeedbackType: typeof feedbackTypeLabels
  SignoffAction: typeof signoffActionLabels
  ProjectStatus: typeof projectStatusLabels
}

const registry: LabelMap = {
  PortalStage: portalStageLabels,
  PaymentStatus: paymentStatusLabels,
  DeliverableState: deliverableStateLabels,
  InvoiceStatus: invoiceStatusLabels,
  CareTicketStatus: careTicketStatusLabels,
  CarePlan: carePlanLabels,
  CareCreditSize: careCreditSizeLabels,
  FeedbackType: feedbackTypeLabels,
  SignoffAction: signoffActionLabels,
  ProjectStatus: projectStatusLabels,
}

export type LabelDomain = keyof LabelMap

/**
 * Look up the client-facing label for an enum value.
 *
 * Returns a fallback label (tone: 'neutral', text: value) if the value
 * isn't in the registry — defensive, avoids crashes on unexpected data.
 *
 * @example
 *   labelFor('PortalStage', 'IN_REVIEW')
 *   // => { text: 'Ready for your review', tone: 'action' }
 */
export function labelFor<D extends LabelDomain>(
  domain: D,
  value: keyof LabelMap[D] | string
): PortalLabel {
  const map = registry[domain] as Record<string, PortalLabel>
  return (
    map[value as string] || {
      text: String(value),
      tone: 'neutral',
    }
  )
}
