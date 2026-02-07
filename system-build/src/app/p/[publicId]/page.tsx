// Delivery Room - Single-page project portal
// Spec: Minimal premium "Delivery Room" with watermark protection, structured feedback, and clean release/sign-off
import { auth } from '@/lib/auth'
import { redirect, notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { isProjectPaid } from '@/lib/payment-status'
import { DeliverableViewer } from './components/deliverable-viewer'
import { FeedbackForm } from './components/feedback-form'
import { StatusPill } from './components/status-pill'
import type { PortalStage, DeliverableState } from '@prisma/client'

interface PageProps {
  params: Promise<{ publicId: string }>
}

// Map portal stage to display labels
const stageLabels: Record<PortalStage, string> = {
  SCHEDULED: 'Scheduled',
  IN_DELIVERY: 'In Delivery',
  IN_REVIEW: 'In Review',
  APPROVED: 'Approved',
  RELEASED: 'Released',
  COMPLETE: 'Complete',
}

function formatDate(date: Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function formatTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default async function DeliveryRoomPage({ params }: PageProps) {
  const { publicId } = await params
  const session = await auth()

  if (!session?.user) {
    redirect(`/login?callbackUrl=/p/${publicId}`)
  }

  // Fetch project with all related data
  const project = await prisma.projects.findUnique({
    where: { publicId },
    include: {
      clients: {
        select: {
          id: true,
          userId: true,
          contactName: true,
          companyName: true,
        },
      },
      service_templates: {
        select: {
          name: true,
        },
      },
      deliverables: {
        orderBy: { version: 'desc' },
        take: 1, // Latest version only
      },
      feedbacks: {
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          deliverable: {
            select: { version: true },
          },
        },
      },
      signoffs: {
        orderBy: { signedAt: 'desc' },
        take: 1,
      },
      invoices: {
        select: {
          status: true,
          paidAt: true,
        },
      },
    },
  })

  if (!project) {
    notFound()
  }

  // Access control
  const isAdmin = session.user.role === 'INTERNAL_ADMIN'
  const isOwner = project.clients.userId === session.user.id

  if (!isAdmin && !isOwner) {
    notFound()
  }

  const latestDeliverable = project.deliverables[0] || null
  const latestSignoff = project.signoffs[0] || null
  const clientName = project.clients.companyName || project.clients.contactName
  // Check payment via explicit status OR paid invoices
  const isPaid = isProjectPaid(project)
  const isReleased = project.portalStage === 'RELEASED' || project.portalStage === 'COMPLETE'

  // Determine if client can approve/release
  const canApprove = isPaid && latestDeliverable && !isReleased &&
    (project.portalStage === 'IN_REVIEW' || project.portalStage === 'APPROVED')

  // Parse scope included (stored as JSON array or null)
  const scopeIncluded = (project.scopeIncluded as string[] | null) || []

  return (
    <div className="space-y-6">
      {/* Block A — Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-[var(--text)] mb-1">
            {project.name}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            {clientName}
          </p>
        </div>
        <StatusPill stage={project.portalStage} />
      </div>

      {/* Block B — Status Card */}
      <div className="glass glass--card">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Current Stage
            </p>
            <p className="text-sm font-medium text-[var(--text)]">
              {stageLabels[project.portalStage]}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Next
            </p>
            <p className="text-sm font-medium text-[var(--text)]">
              {project.nextMilestoneLabel || '—'}
              {project.nextMilestoneDueAt && (
                <span className="text-[var(--text-muted)] font-normal">
                  {' '}(by {formatDate(project.nextMilestoneDueAt)})
                </span>
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
              Last Update
            </p>
            <p className="text-sm text-[var(--text-muted)]">
              {formatTimestamp(project.lastUpdateAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Block B2 — Live Preview */}
      {project.previewUrl && (
        <div className="glass glass--card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-[var(--text)]">
              Live Preview
            </h2>
            <a
              href={project.previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in new tab
            </a>
          </div>
          <div className="relative w-full rounded-lg overflow-hidden border border-[var(--border)] bg-white" style={{ aspectRatio: '16 / 10' }}>
            <iframe
              src={project.previewUrl}
              title={`${project.name} — Live Preview`}
              className="absolute inset-0 w-full h-full"
              sandbox="allow-scripts allow-same-origin allow-popups"
              loading="lazy"
            />
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-2">
            Interactive preview — scroll and click to explore.
          </p>
        </div>
      )}

      {/* Block C — Scope Summary */}
      <div className="glass glass--card">
        <h2 className="text-sm font-medium text-[var(--text)] mb-3">
          Scope
        </h2>

        {project.service_templates?.name && (
          <p className="text-sm text-[var(--text-muted)] mb-3">
            <span className="text-[var(--text)]">{project.service_templates.name}</span>
          </p>
        )}

        {scopeIncluded.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-2">
              Included
            </p>
            <ul className="space-y-1">
              {scopeIncluded.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                  <svg className="w-4 h-4 text-[var(--accent)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {project.scopeExcluded && (
          <p className="text-sm text-[var(--text-muted)] border-t border-[var(--border)] pt-3 mt-3">
            <span className="text-xs uppercase tracking-wide">Not included:</span>{' '}
            {project.scopeExcluded}
          </p>
        )}

        {project.revisionPolicy && (
          <p className="text-sm text-[var(--text-muted)] border-t border-[var(--border)] pt-3 mt-3">
            <span className="text-xs uppercase tracking-wide">Revisions:</span>{' '}
            {project.revisionPolicy}
          </p>
        )}
      </div>

      {/* Block D — Deliverables */}
      <div className="glass glass--card">
        <h2 className="text-sm font-medium text-[var(--text)] mb-4">
          Deliverable
        </h2>

        {latestDeliverable ? (
          <DeliverableViewer
            deliverable={{
              id: latestDeliverable.id,
              title: latestDeliverable.title,
              version: latestDeliverable.version,
              state: latestDeliverable.state,
              filePreviewUrl: latestDeliverable.filePreviewUrl,
              fileDownloadUrl: latestDeliverable.fileDownloadUrl,
              mimeType: latestDeliverable.mimeType,
              createdAt: latestDeliverable.createdAt,
            }}
            projectPublicId={publicId}
            isPaid={isPaid}
            isReleased={isReleased}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)] py-8 text-center">
            No deliverables yet. Check back soon.
          </p>
        )}
      </div>

      {/* Block E — Feedback + Sign-off */}
      {latestDeliverable && (
        <div className="glass glass--card">
          <h2 className="text-sm font-medium text-[var(--text)] mb-4">
            Feedback
          </h2>

          {/* Show sign-off confirmation if already signed */}
          {latestSignoff && isReleased ? (
            <div className="bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg p-4">
              <p className="text-sm text-[var(--success-text)]">
                <strong>Approved & Released</strong> by {latestSignoff.signedByName} on{' '}
                {formatTimestamp(latestSignoff.signedAt)}
              </p>
              <p className="text-xs text-[var(--success-text)] mt-1 opacity-75">
                Clean downloads are now available.
              </p>
            </div>
          ) : (
            <FeedbackForm
              projectId={project.id}
              projectPublicId={publicId}
              deliverableId={latestDeliverable.id}
              deliverableVersion={latestDeliverable.version}
              userName={session.user.name || clientName}
              userEmail={session.user.email}
              canApprove={canApprove}
              isPaid={isPaid}
            />
          )}

          {/* Recent feedback history */}
          {project.feedbacks.length > 0 && !isReleased && (
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-3">
                Previous Feedback
              </p>
              <div className="space-y-2">
                {project.feedbacks.slice(0, 3).map((fb) => (
                  <div key={fb.id} className="text-sm">
                    <span className="text-[var(--text-muted)]">
                      v{fb.deliverable.version} —{' '}
                    </span>
                    <span className={
                      fb.type === 'APPROVE' ? 'text-[var(--success-text)]' :
                      fb.type === 'APPROVE_MINOR' ? 'text-[var(--accent)]' :
                      'text-[var(--text-muted)]'
                    }>
                      {fb.type === 'APPROVE' ? 'Approved' :
                       fb.type === 'APPROVE_MINOR' ? 'Approved with notes' :
                       'Revision requested'}
                    </span>
                    {fb.notes && (
                      <p className="text-xs text-[var(--text-muted)] mt-1 pl-4 border-l-2 border-[var(--border)]">
                        {fb.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Payment gate notice with Pay Now CTA */}
      {!isPaid && (
        <div className="glass glass--callout bg-[var(--accent-subtle)] border-[var(--accent-muted)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-sm text-[var(--text)]">
                <strong>Payment Required</strong>
              </p>
              <p className="text-sm text-[var(--text-muted)] mt-1">
                Complete payment to unlock downloads and final release.
              </p>
            </div>
            {project.stripePaymentLinkUrl ? (
              <a
                href={project.stripePaymentLinkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--accent)] text-white font-medium rounded-lg hover:bg-[var(--accent-hover)] transition-colors text-sm whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Pay Now
              </a>
            ) : (
              <p className="text-xs text-[var(--text-muted)]">
                Contact us to arrange payment.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Paid confirmation */}
      {isPaid && project.paidAt && (
        <div className="glass glass--callout bg-[var(--success-bg)] border-[var(--success-border)]">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--success-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <p className="text-sm text-[var(--success-text)]">
              <strong>Payment Complete</strong>
              <span className="text-[var(--success-text)] opacity-75 ml-2">
                Paid on {formatDate(project.paidAt)}
              </span>
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
