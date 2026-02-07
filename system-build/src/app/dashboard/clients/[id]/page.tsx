// Dashboard - Client Detail Page
import { prisma } from '@/lib/prisma'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientForm } from './client-form'
import { GenerateLoginLink } from './generate-login-link'
import { GenerateBookingLink } from './generate-booking-link'
import { DeleteClientButton } from './delete-client-button'

interface ClientDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { id } = await params

  // Handle "new" as a special case
  if (id === 'new') {
    return (
      <div className="space-y-6">
        <div>
          <Link
            href="/dashboard/clients"
            className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
          >
            ← Back to Clients
          </Link>
          <h1 className="text-2xl font-semibold text-[var(--text)]">
            Add New Client
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Create a new client account with portal access
          </p>
        </div>
        <ClientForm />
      </div>
    )
  }

  const client = await prisma.clients.findUnique({
    where: { id },
    include: {
      users: {
        select: { email: true, emailVerified: true, createdAt: true },
      },
      projects: {
        orderBy: { updatedAt: 'desc' },
        include: {
          service_templates: { select: { name: true } },
          _count: { select: { tasks: true, milestones: true } },
        },
      },
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      leads: {
        orderBy: { createdAt: 'desc' },
        take: 3,
      },
    },
  })

  if (!client) {
    notFound()
  }

  // Calculate totals
  const totalInvoiced = client.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalPaid = client.invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((sum, inv) => sum + Number(inv.total), 0)
  const totalOutstanding = client.invoices
    .filter((inv) => ['SENT', 'VIEWED', 'OVERDUE'].includes(inv.status))
    .reduce((sum, inv) => sum + Number(inv.total), 0)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/clients"
          className="inline-flex items-center text-sm text-[var(--text-muted)] hover:text-[var(--text)] mb-4"
        >
          ← Back to Clients
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text)]">
              {client.companyName || client.contactName}
            </h1>
            {client.companyName && (
              <p className="text-[var(--text-muted)] mt-1">
                {client.contactName}
              </p>
            )}
          </div>
          <div className="flex gap-3">
            <Link
              href={`/dashboard/projects/new?clientId=${client.id}`}
              className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-[var(--accent-subtle)] transition-colors"
            >
              New Project
            </Link>
            <Link
              href={`/dashboard/invoices/new?clientId=${client.id}`}
              className="px-4 py-2 bg-[var(--text)] text-[var(--bg)] rounded-lg text-sm font-medium hover:opacity-85 transition-colors"
            >
              New Invoice
            </Link>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Projects</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">
            {client.projects.length}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Total Invoiced</p>
          <p className="text-2xl font-semibold text-[var(--text)] mt-1">
            {formatCurrency(totalInvoiced)}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Paid</p>
          <p className="text-2xl font-semibold text-[var(--success-text)] mt-1">
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-4">
          <p className="text-sm text-[var(--text-muted)]">Outstanding</p>
          <p className="text-2xl font-semibold text-orange-500 mt-1">
            {formatCurrency(totalOutstanding)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Client Info */}
        <div className="space-y-6">
          {/* Contact Information */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Contact Information
            </h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[var(--text-subtle)]">Email</p>
                <a
                  href={`mailto:${client.contactEmail}`}
                  className="text-[var(--text)] hover:underline"
                >
                  {client.contactEmail}
                </a>
              </div>
              {client.phone && (
                <div>
                  <p className="text-xs text-[var(--text-subtle)]">Phone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-[var(--text)] hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              )}
              {client.website && (
                <div>
                  <p className="text-xs text-[var(--text-subtle)]">Website</p>
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--text)] hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Portal Access */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Portal Access
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Login Email</span>
                <span className="text-sm text-[var(--text)]">{client.users.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Email Verified</span>
                <span className={`text-sm ${client.users.emailVerified ? 'text-[var(--success-text)]' : 'text-yellow-500'}`}>
                  {client.users.emailVerified ? 'Yes' : 'Pending'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-muted)]">Account Created</span>
                <span className="text-sm text-[var(--text)]">
                  {formatDate(client.users.createdAt)}
                </span>
              </div>
            </div>

            {/* Generate Login Link - for clients who can't receive emails */}
            <GenerateLoginLink email={client.users.email} />
          </div>

          {/* Booking Access - for routed clients */}
          {client.assignedPath && client.assignedPath !== 'HOLD' && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Booking Access
              </h2>
              <GenerateBookingLink
                clientId={client.id}
                clientName={client.contactName}
                assignedPath={client.assignedPath}
              />
            </div>
          )}

          {/* Notes */}
          {client.notes && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
              <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
                Notes
              </h2>
              <p className="text-sm text-[var(--text)] whitespace-pre-wrap">
                {client.notes}
              </p>
            </div>
          )}

          {/* Edit Client */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-6">
            <h2 className="text-sm font-medium text-[var(--text-muted)] uppercase tracking-wider mb-4">
              Edit Client
            </h2>
            <ClientForm client={client} />
          </div>

          {/* Danger Zone */}
          <div className="bg-[var(--surface)] rounded-lg border border-red-500/30 p-6">
            <h2 className="text-sm font-medium text-[var(--error-text)] uppercase tracking-wider mb-4">
              Danger Zone
            </h2>
            <DeleteClientButton
              clientId={client.id}
              clientName={client.companyName || client.contactName}
              hasProjects={client.projects.length > 0}
              hasInvoices={client.invoices.length > 0}
            />
          </div>
        </div>

        {/* Right Column - Projects & Invoices */}
        <div className="lg:col-span-2 space-y-6">
          {/* Projects */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-medium text-[var(--text)]">
                Projects ({client.projects.length})
              </h2>
              <Link
                href={`/dashboard/projects/new?clientId=${client.id}`}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                + Add Project
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {client.projects.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[var(--text-muted)] text-center">
                  No projects yet
                </p>
              ) : (
                client.projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="px-6 py-4 block hover:bg-[var(--accent-subtle)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {project.name}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {project.service_templates?.name || 'Custom Project'} · {project._count.tasks} tasks · {project._count.milestones} milestones
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getProjectStatusColor(project.status)}`}>
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Recent Invoices */}
          <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
            <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="font-medium text-[var(--text)]">
                Recent Invoices
              </h2>
              <Link
                href={`/dashboard/invoices?clientId=${client.id}`}
                className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
              >
                View all →
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {client.invoices.length === 0 ? (
                <p className="px-6 py-8 text-sm text-[var(--text-muted)] text-center">
                  No invoices yet
                </p>
              ) : (
                client.invoices.map((invoice) => (
                  <Link
                    key={invoice.id}
                    href={`/dashboard/invoices/${invoice.id}`}
                    className="px-6 py-4 block hover:bg-[var(--accent-subtle)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {invoice.invoiceNumber}
                        </p>
                        <p className="text-xs text-[var(--text-muted)] mt-1">
                          {formatDate(invoice.createdAt)}
                          {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-[var(--text)]">
                          {formatCurrency(Number(invoice.total))}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getInvoiceStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Related Leads */}
          {client.leads.length > 0 && (
            <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)]">
              <div className="px-6 py-4 border-b border-[var(--border)]">
                <h2 className="font-medium text-[var(--text)]">
                  Related Leads
                </h2>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {client.leads.map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/dashboard/leads/${lead.id}`}
                    className="px-6 py-4 block hover:bg-[var(--accent-subtle)]/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-[var(--text)]">
                          {lead.email}
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          {formatDate(lead.createdAt)}
                        </p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${getLeadStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper functions
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function getProjectStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    PENDING_APPROVAL: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    IN_PROGRESS: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    ON_HOLD: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    COMPLETED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    CANCELLED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  }
  return colors[status] || colors.DRAFT
}

function getInvoiceStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    SENT: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    VIEWED: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    PAID: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    OVERDUE: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    CANCELLED: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  }
  return colors[status] || colors.DRAFT
}

function getLeadStatusColor(status: string) {
  const colors: Record<string, string> = {
    NEW: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    CONTACTED: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    QUALIFIED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    CONVERTED: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    DISQUALIFIED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    ARCHIVED: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  }
  return colors[status] || colors.NEW
}
