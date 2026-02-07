'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { archiveMultipleClients, deleteMultipleClients } from '@/lib/actions/clients'

interface Client {
  id: string
  companyName: string | null
  contactName: string
  contactEmail: string
  phone: string | null
  isArchived: boolean
  createdAt: Date
  _count: {
    projects: number
    invoices: number
  }
  projects: {
    status: string
    name: string
  }[]
}

interface ClientsTableProps {
  clients: Client[]
  showArchived: boolean
}

export function ClientsTable({ clients, showArchived }: ClientsTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showArchiveModal, setShowArchiveModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Clients with projects/invoices can't be deleted
  const deletableClients = clients.filter(
    (c) => c._count.projects === 0 && c._count.invoices === 0
  )
  const allDeletableSelected =
    deletableClients.length > 0 &&
    deletableClients.every((c) => selectedIds.has(c.id))

  const toggleSelectAll = () => {
    if (allDeletableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(deletableClients.map((c) => c.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const handleArchive = async () => {
    setError(null)
    startTransition(async () => {
      const result = await archiveMultipleClients(Array.from(selectedIds))
      if (result?.error) {
        setError(result.error)
        setShowArchiveModal(false)
      } else {
        setSelectedIds(new Set())
        setShowArchiveModal(false)
        router.refresh()
      }
    })
  }

  const handleDelete = async () => {
    setError(null)
    startTransition(async () => {
      const result = await deleteMultipleClients(Array.from(selectedIds))
      if (result?.error) {
        setError(result.error)
        setShowDeleteModal(false)
      } else {
        setSelectedIds(new Set())
        setShowDeleteModal(false)
        router.refresh()
      }
    })
  }

  const selectedHasData = Array.from(selectedIds).some((id) => {
    const client = clients.find((c) => c.id === id)
    return client && (client._count.projects > 0 || client._count.invoices > 0)
  })

  return (
    <>
      {/* Selection Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-amber-600">
            {selectedIds.size} client{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <div className="flex gap-2">
            {!showArchived && (
              <button
                onClick={() => setShowArchiveModal(true)}
                className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
              >
                Archive Selected
              </button>
            )}
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={selectedHasData}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title={selectedHasData ? 'Cannot delete clients with projects or invoices' : ''}
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg px-4 py-3">
          <p className="text-sm text-[var(--error-text)]">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--border)]">
          <thead className="bg-[var(--surface-2)]">
            <tr>
              <th scope="col" className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allDeletableSelected && deletableClients.length > 0}
                  onChange={toggleSelectAll}
                  disabled={deletableClients.length === 0}
                  className="w-4 h-4 rounded border-[var(--border)] text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                  title="Select all on this page"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Client
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Projects
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Latest Project
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Added
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {clients.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  {showArchived ? 'No archived clients' : 'No clients found'}
                </td>
              </tr>
            ) : (
              clients.map((client) => {
                const hasData = client._count.projects > 0 || client._count.invoices > 0
                return (
                  <tr
                    key={client.id}
                    className={`hover:bg-[var(--accent-subtle)] ${
                      selectedIds.has(client.id) ? 'bg-amber-500/5' : ''
                    } ${client.isArchived ? 'opacity-60' : ''}`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(client.id)}
                        onChange={() => toggleSelect(client.id)}
                        disabled={hasData && !showArchived}
                        className="w-4 h-4 rounded border-[var(--border)] text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                        title={hasData ? 'Client has projects or invoices' : ''}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/clients/${client.id}`} className="block">
                        <p className="text-sm font-medium text-[var(--text)]">
                          {client.companyName || client.contactName}
                          {client.isArchived && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-400">
                              Archived
                            </span>
                          )}
                        </p>
                        {client.companyName && (
                          <p className="text-sm text-[var(--text-muted)]">
                            {client.contactName}
                          </p>
                        )}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-[var(--text)]">
                        {client.contactEmail}
                      </p>
                      {client.phone && (
                        <p className="text-sm text-[var(--text-muted)]">
                          {client.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text)]">
                      {client._count.projects}
                    </td>
                    <td className="px-6 py-4">
                      {client.projects[0] ? (
                        <div>
                          <p className="text-sm text-[var(--text)] truncate max-w-[200px]">
                            {client.projects[0].name}
                          </p>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(client.projects[0].status)}`}
                          >
                            {client.projects[0].status.replace('_', ' ')}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--text-subtle)]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {formatDate(client.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Modal */}
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="archive-clients-title">
          <div className="bg-[var(--surface)] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 id="archive-clients-title" className="text-lg font-semibold text-[var(--text)] mb-2">
              Archive Clients
            </h3>
            <p className="text-[var(--text-muted)] mb-6">
              You are about to archive <span className="font-semibold">{selectedIds.size}</span>{' '}
              client{selectedIds.size === 1 ? '' : 's'}. Archived clients will be hidden from the
              main list but can be restored later.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowArchiveModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleArchive}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Archiving...' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="delete-clients-title">
          <div className="bg-[var(--surface)] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 id="delete-clients-title" className="text-lg font-semibold text-[var(--text)] mb-2">
              Delete Clients
            </h3>
            <p className="text-[var(--text-muted)] mb-2">
              You are about to permanently delete{' '}
              <span className="font-semibold">{selectedIds.size}</span> client
              {selectedIds.size === 1 ? '' : 's'}.
            </p>
            <p className="text-[var(--error-text)] text-sm mb-6">
              This action cannot be undone. The client account and associated user will be removed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isPending ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    DRAFT: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
    PENDING_APPROVAL: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    IN_PROGRESS: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    ON_HOLD: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
    COMPLETED: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    CANCELLED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
  }
  return colors[status] || colors.DRAFT
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
