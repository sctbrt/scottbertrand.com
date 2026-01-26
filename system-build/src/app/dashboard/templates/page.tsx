// Dashboard - Service Templates Management Page
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            Service Templates
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Define reusable service packages with pricing and deliverables
          </p>
        </div>
        <Link
          href="/dashboard/templates/new"
          className="px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors"
        >
          New Template
        </Link>
      </div>

      {/* Active Templates */}
      <div>
        <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
          Active Templates ({activeTemplates.length})
        </h2>
        {activeTemplates.length === 0 ? (
          <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No active templates. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTemplates.map((template) => (
              <TemplateCard key={template.id} template={template} />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Templates */}
      {inactiveTemplates.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
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
  const scope = (template.scope as string[] | null) || []
  const deliverables = (template.deliverables as string[] | null) || []

  return (
    <Link
      href={`/dashboard/templates/${template.id}`}
      className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-colors block"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {template.name}
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            /{template.slug}
          </p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${template.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>
          {template.isActive ? 'Active' : 'Inactive'}
        </span>
      </div>

      {template.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {template.description}
        </p>
      )}

      <div className="flex items-baseline gap-1 mb-4">
        <span className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(Number(template.price))}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {template.currency}
        </span>
        {template.estimatedDays && (
          <span className="text-sm text-gray-400 dark:text-gray-500 ml-2">
            · {template.estimatedDays} days
          </span>
        )}
      </div>

      {/* Scope Preview */}
      {scope.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Scope</p>
          <div className="flex flex-wrap gap-1">
            {scope.slice(0, 3).map((item, i) => (
              <span key={i} className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded">
                {item}
              </span>
            ))}
            {scope.length > 3 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                +{scope.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
