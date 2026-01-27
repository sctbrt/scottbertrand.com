'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { archiveMultipleLeads } from '@/lib/actions/leads'

interface Lead {
  id: string
  name: string | null
  email: string
  service: string | null
  status: string
  source: string | null
  createdAt: Date
  service_templates: { name: string } | null
}

interface LeadsTableProps {
  leads: Lead[]
}

export function LeadsTable({ leads }: LeadsTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showModal, setShowModal] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const selectableLeads = leads.filter(
    (lead) => lead.status !== 'CONVERTED'
  )
  const allSelectableSelected =
    selectableLeads.length > 0 &&
    selectableLeads.every((lead) => selectedIds.has(lead.id))

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

  return (
    <>
      {/* Selection Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {selectedIds.size} lead{selectedIds.size === 1 ? '' : 's'} selected
          </span>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Archive Selected
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-[#2c2c2e] rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  checked={allSelectableSelected && selectableLeads.length > 0}
                  onChange={toggleSelectAll}
                  disabled={selectableLeads.length === 0}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                  title="Select all on this page"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Service
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Source
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {leads.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-gray-500 dark:text-gray-400"
                >
                  No leads found
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const isConverted = lead.status === 'CONVERTED'
                return (
                  <tr
                    key={lead.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
                      selectedIds.has(lead.id) ? 'bg-amber-50 dark:bg-amber-900/10' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        disabled={isConverted}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-amber-600 focus:ring-amber-500 disabled:opacity-50"
                        title={isConverted ? 'Converted leads cannot be archived' : ''}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/leads/${lead.id}`} className="block">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {lead.name || 'No name'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {lead.email}
                        </p>
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                      {lead.service_templates?.name || lead.service || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {lead.source || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(lead.createdAt)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Archive Leads
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You are about to archive{' '}
              <span className="font-semibold">{selectedIds.size}</span> lead
              {selectedIds.size === 1 ? '' : 's'}. This will move them to the
              Archived status. You can restore them later if needed.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
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
    </>
  )
}

function getStatusColor(status: string) {
  const colors: Record<string, string> = {
    NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    CONTACTED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    QUALIFIED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    CONVERTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    DISQUALIFIED: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    ARCHIVED: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
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
