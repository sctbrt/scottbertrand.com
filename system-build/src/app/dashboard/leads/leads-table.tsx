'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { archiveMultipleLeads, updateLeadStatus, updateLeadNotes } from '@/lib/actions/leads'
import type { LeadListItem } from '@/lib/data/leads'

interface LeadsTableProps {
  leads: LeadListItem[]
  currentStatus?: string
}

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'DISQUALIFIED', 'ARCHIVED']

export function LeadsTable({ leads, currentStatus }: LeadsTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null)
  const [notesPanel, setNotesPanel] = useState<{ leadId: string; notes: string } | null>(null)
  const [savingNotes, setSavingNotes] = useState(false)

  const selectableLeads = leads.filter((lead) => lead.status !== 'CONVERTED')
  const allSelectableSelected =
    selectableLeads.length > 0 && selectableLeads.every((lead) => selectedIds.has(lead.id))

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableLeads.map((lead) => lead.id)))
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
      const result = await archiveMultipleLeads(Array.from(selectedIds))
      if (result?.error) {
        setError(result.error)
        setShowModal(false)
      } else {
        setSelectedIds(new Set())
        setShowModal(false)
        router.refresh()
      }
    })
  }

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    setUpdatingStatusId(leadId)
    const formData = new FormData()
    formData.append('status', newStatus)

    const result = await updateLeadStatus(leadId, null, formData)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setUpdatingStatusId(null)
  }

  const openNotesPanel = (lead: LeadListItem) => {
    setNotesPanel({ leadId: lead.id, notes: lead.internalNotes || '' })
  }

  const saveNotes = async () => {
    if (!notesPanel) return
    setSavingNotes(true)
    const result = await updateLeadNotes(notesPanel.leadId, notesPanel.notes)
    if (result?.error) {
      setError(result.error)
    } else {
      router.refresh()
    }
    setSavingNotes(false)
    setNotesPanel(null)
  }

  return (
    <>
      {/* Selection Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-amber-600">
            {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          {currentStatus !== 'ARCHIVED' && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Archive Selected
            </button>
          )}
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
                  checked={allSelectableSelected && selectableLeads.length > 0}
                  onChange={toggleSelectAll}
                  disabled={selectableLeads.length === 0}
                  className="w-4 h-4 rounded border-[var(--border)] text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                  title="Select all on this page"
                />
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Contact
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Service
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Notes
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {leads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isConverted = lead.status === 'CONVERTED'
                const isUpdating = updatingStatusId === lead.id
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-[var(--accent-subtle)] ${
                      selectedIds.has(lead.id) ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        disabled={isConverted}
                        className="w-4 h-4 rounded border-[var(--border)] text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                        title={isConverted ? 'Converted leads cannot be archived' : ''}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/leads/${lead.id}`} className="block">
                        <p className="text-sm font-medium text-[var(--text)]">
                          {lead.name || 'No name'}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">{lead.email}</p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text)]">
                      {lead.service_templates?.name || lead.service || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {isConverted ? (
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                          {lead.status}
                        </span>
                      ) : (
                        <select
                          value={lead.status}
                          onChange={(e) => handleStatusChange(lead.id, e.target.value)}
                          disabled={isUpdating}
                          aria-label={`Status for ${lead.name || lead.email}`}
                          className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer ${getStatusColor(lead.status)} ${
                            isUpdating ? 'opacity-50' : ''
                          }`}
                        >
                          {STATUSES.filter((s) => s !== 'CONVERTED').map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => openNotesPanel(lead)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          lead.internalNotes
                            ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20'
                            : 'text-[var(--text-subtle)] hover:text-[var(--text-muted)] hover:bg-[var(--accent-subtle)]'
                        }`}
                        title={lead.internalNotes ? 'View/edit notes' : 'Add notes'}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                          />
                        </svg>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text-muted)]">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Archive Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="archive-leads-title">
          <div className="bg-[var(--surface)] rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 id="archive-leads-title" className="text-lg font-semibold text-[var(--text)] mb-2">Archive Leads</h3>
            <p className="text-[var(--text-muted)] mb-6">
              You are about to archive <span className="font-semibold">{selectedIds.size}</span> lead
              {selectedIds.size === 1 ? '' : 's'}. This will move them to the Archived status. You can
              restore them later if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
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

      {/* Notes Side Panel */}
      {notesPanel && (
        <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-labelledby="notes-panel-title">
          <div className="absolute inset-0 bg-black/30" onClick={() => setNotesPanel(null)} />
          <div className="relative w-full max-w-md bg-[var(--surface)] shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 id="notes-panel-title" className="text-lg font-semibold text-[var(--text)]">Internal Notes</h3>
              <button
                onClick={() => setNotesPanel(null)}
                className="p-1 text-[var(--text-subtle)] hover:text-[var(--text)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={notesPanel.notes}
                onChange={(e) => setNotesPanel({ ...notesPanel, notes: e.target.value })}
                placeholder="Add internal notes about this lead..."
                className="w-full h-64 p-3 text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-muted)] focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
              <p className="text-xs text-[var(--text-subtle)] mt-2">
                These notes are only visible to admins.
              </p>
            </div>
            <div className="p-4 border-t border-[var(--border)] flex gap-3 justify-end">
              <button
                onClick={() => setNotesPanel(null)}
                className="px-4 py-2 text-sm text-[var(--text)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                disabled={savingNotes}
                className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-colors"
              >
                {savingNotes ? 'Saving...' : 'Save Notes'}
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
    NEW: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    CONTACTED: 'bg-sky-500/20 text-sky-400 border border-sky-500/30',
    QUALIFIED: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    CONVERTED: 'bg-violet-500/20 text-violet-400 border border-violet-500/30',
    DISQUALIFIED: 'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    ARCHIVED: 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30',
  }
  return colors[status] || colors.NEW
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}
