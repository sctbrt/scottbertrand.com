'use client'

// Lead Actions Component - Status changes, mark spam, delete
import { useActionState } from 'react'
import { updateLeadStatus, markAsSpam, deleteLead } from '@/lib/actions/leads'

interface LeadActionsProps {
  lead: {
    id: string
    status: string
    isSpam: boolean
  }
}

export function LeadActions({ lead }: LeadActionsProps) {
  const [statusState, statusAction, isUpdating] = useActionState(
    updateLeadStatus.bind(null, lead.id),
    null
  )
  const [spamState, spamAction, isMarkingSpam] = useActionState(
    markAsSpam.bind(null, lead.id),
    null
  )
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteLead.bind(null, lead.id),
    null
  )

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData()
    formData.append('status', newStatus)
    statusAction(formData)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Status Dropdown */}
      <select
        value={lead.status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        aria-label="Lead status"
        className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm"
      >
        <option value="NEW">New</option>
        <option value="CONTACTED">Contacted</option>
        <option value="QUALIFIED">Qualified</option>
        <option value="CONVERTED">Converted</option>
        <option value="DISQUALIFIED">Disqualified</option>
        <option value="ARCHIVED">Archived</option>
      </select>

      {/* Mark as Spam */}
      {!lead.isSpam && (
        <form action={spamAction}>
          <button
            type="submit"
            disabled={isMarkingSpam}
            className="px-3 py-2 text-orange-500 hover:text-orange-400 text-sm disabled:opacity-50"
          >
            {isMarkingSpam ? 'Marking...' : 'Mark Spam'}
          </button>
        </form>
      )}

      {/* Delete */}
      <form action={deleteAction}>
        <button
          type="submit"
          disabled={isDeleting}
          className="px-3 py-2 text-[var(--error-text)] hover:text-red-500 text-sm disabled:opacity-50"
          onClick={(e) => {
            if (!confirm('Are you sure you want to delete this lead?')) {
              e.preventDefault()
            }
          }}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </button>
      </form>

      {/* Error Messages */}
      {(statusState?.error || spamState?.error || deleteState?.error) && (
        <p className="text-sm text-[var(--error-text)]">
          {statusState?.error || spamState?.error || deleteState?.error}
        </p>
      )}
    </div>
  )
}
