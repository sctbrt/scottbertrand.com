// Dashboard - Service Template Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { TemplateForm } from './template-form'

interface TemplateDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TemplateDetailPage({ params }: TemplateDetailPageProps) {
  const { id } = await params

  // Handle "new" as a special case
  if (id === 'new') {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/templates"
            className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
          >
            ← Back to Templates
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Create Service Template
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Define a reusable service package with pricing and deliverables
          </p>
        </div>
        <div className="max-w-2xl">
          <TemplateForm />
        </div>
      </div>
    )
  }

  const template = await prisma.service_templates.findUnique({
    where: { id },
    include: {
      projects: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          clients: {
            select: { companyName: true, contactName: true },
          },
        },
      },
      leads: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      _count: {
        select: { projects: true, leads: true },
      },
    },
  })

  if (!template) {
    notFound()
  }

  // Parse scope as structured V11 object
  interface TemplateScope {
    tier?: 'build' | 'transform' | 'care'
    color?: 'amber' | 'violet' | 'blue'
    revisions?: number | string
    meetings?: number | string
    pricingType?: 'fixed' | 'scoped' | 'monthly' | 'application'
    plan?: string
    credits?: number
  }
  const scope: TemplateScope = (template.scope && typeof template.scope === 'object' && !Array.isArray(template.scope))
    ? (template.scope as TemplateScope)
    : {}
  const deliverables = (template.deliverables as string[]) || []
  const checklistItems = (template.checklistItems as { title: string; description?: string }[]) || []

  const TIER_BADGE: Record<string, string> = {
    build: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    transform: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    care: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  const TIER_LABELS: Record<string, string> = { build: 'Build', transform: 'Transform', care: 'Care' }
  const pricingLabel = scope.pricingType === 'scoped' ? 'Scoped' : scope.pricingType === 'monthly' ? '/mo' : scope.pricingType === 'application' ? 'By application' : null

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/templates"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
        >
          ← Back to Templates
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-[var(--text)]">
                {template.name}
              </h1>
              {scope.tier && (
                <span className={`text-xs px-2.5 py-1 rounded-full border ${TIER_BADGE[scope.tier]}`}>
                  {TIER_LABELS[scope.tier]}
                </span>
              )}
              <span className={`text-sm px-3 py-1 rounded-full ${template.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'}`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-[var(--text-muted)] mt-1">
              /{template.slug}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            {Number(template.price) > 0 ? (
              <>
                <span className="text-3xl font-semibold text-[var(--text)]">
                  {formatCurrency(Number(template.price))}
                </span>
                {pricingLabel && (
                  <span className="text-[var(--text-muted)]">{pricingLabel}</span>
                )}
              </>
            ) : (
              <span className="text-xl font-medium text-[var(--text-muted)]">
                {pricingLabel || 'Custom pricing'}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Template Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {template.description && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">
                Description
              </h2>
              <p className="text-[var(--text)] whitespace-pre-wrap">
                {template.description}
              </p>
            </div>
          )}

          {/* Scope */}
          {scope.tier && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Scope
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div>
                  <dt className="text-xs text-[var(--text-subtle)]">Tier</dt>
                  <dd className="text-sm text-[var(--text)] mt-0.5">{TIER_LABELS[scope.tier]}</dd>
                </div>
                {scope.pricingType && (
                  <div>
                    <dt className="text-xs text-[var(--text-subtle)]">Pricing Type</dt>
                    <dd className="text-sm text-[var(--text)] mt-0.5 capitalize">{scope.pricingType}</dd>
                  </div>
                )}
                {scope.revisions != null && (
                  <div>
                    <dt className="text-xs text-[var(--text-subtle)]">Revisions</dt>
                    <dd className="text-sm text-[var(--text)] mt-0.5">{scope.revisions}</dd>
                  </div>
                )}
                {scope.meetings != null && (
                  <div>
                    <dt className="text-xs text-[var(--text-subtle)]">Meetings</dt>
                    <dd className="text-sm text-[var(--text)] mt-0.5">{scope.meetings}</dd>
                  </div>
                )}
                {scope.credits != null && (
                  <div>
                    <dt className="text-xs text-[var(--text-subtle)]">Credits / Month</dt>
                    <dd className="text-sm text-[var(--text)] mt-0.5">{scope.credits}</dd>
                  </div>
                )}
                {scope.plan && (
                  <div>
                    <dt className="text-xs text-[var(--text-subtle)]">Care Plan</dt>
                    <dd className="text-sm text-[var(--text)] mt-0.5">{scope.plan}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Deliverables ({deliverables.length} items)
              </h2>
              <ul className="space-y-2">
                {deliverables.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span className="text-[var(--text)]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Default Checklist */}
          {checklistItems.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Default Checklist ({checklistItems.length} tasks)
              </h2>
              <ul className="space-y-3">
                {checklistItems.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-[var(--surface-2)] flex items-center justify-center text-xs text-[var(--text-muted)] flex-shrink-0">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[var(--text)] font-medium">{item.title}</p>
                      {item.description && (
                        <p className="text-sm text-[var(--text-muted)] mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recent Projects */}
          {template.projects.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
                <h2 className="font-medium text-[var(--text)]">
                  Recent Projects ({template._count.projects})
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {template.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="px-6 py-3 block hover:bg-[var(--accent-subtle)]/50 transition-colors"
                  >
                    <p className="text-sm font-medium text-[var(--text)]">
                      {project.name}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {project.clients.companyName || project.clients.contactName}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Edit Form & Stats */}
        <div className="space-y-6">
          {/* Stats */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Usage Stats
            </h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Projects</span>
                <span className="text-[var(--text)] font-medium">
                  {template._count.projects}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Leads</span>
                <span className="text-[var(--text)] font-medium">
                  {template._count.leads}
                </span>
              </div>
              {template.estimatedDays && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">Est. Duration</span>
                  <span className="text-[var(--text)] font-medium">
                    {template.estimatedDays} days
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Edit Form */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Edit Template
            </h2>
            <TemplateForm template={template} />
          </div>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}
