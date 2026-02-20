// Dashboard - Service Templates Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

// V11 Tier definitions
interface TemplateScope {
  tier?: 'build' | 'transform' | 'care'
  color?: 'amber' | 'violet' | 'blue'
  revisions?: number | string
  meetings?: number | string
  pricingType?: 'fixed' | 'scoped' | 'monthly' | 'application'
  plan?: string
  credits?: number
}

const TIER_CONFIG: Record<string, { label: string; color: string; borderColor: string }> = {
  build: {
    label: 'Build',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
  },
  transform: {
    label: 'Transform',
    color: 'text-violet-400',
    borderColor: 'border-violet-500/30',
  },
  care: {
    label: 'Care',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
  },
}

const TIER_BADGE: Record<string, string> = {
  build: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  transform: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  care: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

function parseScope(raw: unknown): TemplateScope {
  if (!raw || typeof raw !== 'object') return {}
  // Handle legacy string[] format
  if (Array.isArray(raw)) return {}
  return raw as TemplateScope
}

export default async function TemplatesPage() {
  const templates = await prisma.service_templates.findMany({
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { projects: true, leads: true },
      },
    },
  })

  const activeTemplates = templates.filter((t) => t.isActive)
  const inactiveTemplates = templates.filter((t) => !t.isActive)

  // Group active templates by tier
  const tierGroups: Record<string, typeof activeTemplates> = { build: [], transform: [], care: [] }
  const ungrouped: typeof activeTemplates = []

  for (const t of activeTemplates) {
    const scope = parseScope(t.scope)
    if (scope.tier && tierGroups[scope.tier]) {
      tierGroups[scope.tier].push(t)
    } else {
      ungrouped.push(t)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Service Templates
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Define reusable service packages with pricing and deliverables
          </p>
        </div>
        <Link
          href="/dashboard/templates/new"
          className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors"
        >
          New Template
        </Link>
      </div>

      {/* Active Templates — Grouped by Tier */}
      {activeTemplates.length === 0 ? (
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-8 text-center">
          <p className="text-[var(--text-muted)]">
            No active templates. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Tier Groups */}
          {(['build', 'transform', 'care'] as const).map((tier) => {
            const group = tierGroups[tier]
            if (group.length === 0) return null
            const config = TIER_CONFIG[tier]
            return (
              <div key={tier}>
                <div className={`flex items-center gap-2 mb-4 pb-2 border-b ${config.borderColor}`}>
                  <span className={`w-2 h-2 rounded-full ${TIER_BADGE[tier].split(' ')[0]}`} />
                  <h2 className={`text-sm font-medium uppercase tracking-wider ${config.color}`}>
                    {config.label}
                  </h2>
                  <span className="text-xs text-[var(--text-subtle)]">({group.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((template) => (
                    <TemplateCard key={template.id} template={template} />
                  ))}
                </div>
              </div>
            )
          })}

          {/* Ungrouped (legacy templates without tier) */}
          {ungrouped.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Other Templates ({ungrouped.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungrouped.map((template) => (
                  <TemplateCard key={template.id} template={template} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inactive Templates */}
      {inactiveTemplates.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Inactive Templates ({inactiveTemplates.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-60">
            {inactiveTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

import type { Decimal } from '@prisma/client/runtime/library'

type DecimalLike = Decimal | string | number

function TemplateCard({
  template,
}: {
  template: {
    id: string
    name: string
    slug: string
    description: string | null
    price: DecimalLike
    currency: string
    estimatedDays: number | null
    isActive: boolean
    scope: unknown // Prisma JsonValue
    deliverables: unknown // Prisma JsonValue
    _count: {
      projects: number
      leads: number
    }
  }
}) {
  const scope = parseScope(template.scope)
  const deliverables = (template.deliverables as string[] | null) || []
  const tierBadge = scope.tier ? TIER_BADGE[scope.tier] : null
  const pricingLabel = scope.pricingType === 'scoped' ? 'Scoped' : scope.pricingType === 'monthly' ? '/mo' : scope.pricingType === 'application' ? 'By application' : null

  return (
    <Link
      href={`/dashboard/templates/${template.id}`}
      className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-5 hover:border-[var(--accent-muted)] transition-colors block"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-[var(--text)]">
            {template.name}
          </h3>
          <p className="text-xs text-[var(--text-subtle)] mt-0.5">
            /{template.slug}
          </p>
        </div>
        {tierBadge ? (
          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tierBadge}`}>
            {TIER_CONFIG[scope.tier!].label}
          </span>
        ) : (
          <span className={`text-xs px-2 py-1 rounded-full ${template.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-zinc-500/20 text-zinc-400'}`}>
            {template.isActive ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-[var(--text-muted)] mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      <div className="flex items-baseline gap-1 mb-4">
        {Number(template.price) > 0 ? (
          <>
            <span className="text-2xl font-semibold text-[var(--text)]">
              {formatCurrency(Number(template.price))}
            </span>
            {pricingLabel && (
              <span className="text-sm text-[var(--text-muted)]">
                {pricingLabel}
              </span>
            )}
          </>
        ) : (
          <span className="text-lg font-medium text-[var(--text-muted)]">
            {pricingLabel || 'Custom'}
          </span>
        )}
        {template.estimatedDays && (
          <span className="text-sm text-[var(--text-subtle)] ml-2">
            · {template.estimatedDays} days
          </span>
        )}
      </div>

      {/* Scope Preview — Structured fields */}
      {scope.tier && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {scope.revisions != null && (
            <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded">
              {scope.revisions} revision{scope.revisions !== 1 ? 's' : ''}
            </span>
          )}
          {scope.meetings != null && (
            <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded">
              {scope.meetings} meeting{scope.meetings !== 0 && scope.meetings !== '0' ? 's' : ''}
            </span>
          )}
          {scope.credits != null && (
            <span className="text-[10px] bg-[var(--surface-2)] text-[var(--text-muted)] px-2 py-0.5 rounded">
              {scope.credits} credits/mo
            </span>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="pt-3 border-t border-[var(--border)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
        <span>{template._count.projects} projects</span>
        <span>{template._count.leads} leads</span>
        {deliverables.length > 0 && (
          <span>{deliverables.length} deliverables</span>
        )}
      </div>
    </Link>
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
