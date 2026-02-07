'use client'

// Invoice Actions Component - Status changes, send, mark paid, etc.
import { useActionState } from 'react'
import { updateInvoiceStatus, sendInvoice, deleteInvoice } from '@/lib/actions/invoices'

interface InvoiceActionsProps {
  invoice: {
    id: string
    invoiceNumber: string
    status: string
    clients: {
      contactEmail: string
      contactName: string
    }
  }
}

export function InvoiceActions({ invoice }: InvoiceActionsProps) {
  const [sendState, sendAction, isSending] = useActionState(
    sendInvoice.bind(null, invoice.id),
    null
  )
  const [statusState, statusAction, isUpdating] = useActionState(
    updateInvoiceStatus.bind(null, invoice.id),
    null
  )
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteInvoice.bind(null, invoice.id),
    null
  )

  const handleStatusChange = (newStatus: string) => {
    const formData = new FormData()
    formData.append('status', newStatus)
    statusAction(formData)
  }

  return (
    <div className="flex items-center gap-3">
      {/* Send Invoice (for DRAFT status) */}
      {invoice.status === 'DRAFT' && (
        <form action={sendAction}>
          <button
            type="submit"
            disabled={isSending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Send Invoice'}
          </button>
        </form>
      )}

      {/* Mark as Paid (for SENT, VIEWED, OVERDUE status) */}
      {['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) && (
        <button
          onClick={() => handleStatusChange('PAID')}
          disabled={isUpdating}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          {isUpdating ? 'Updating...' : 'Mark as Paid'}
        </button>
      )}

      {/* Resend (for SENT, VIEWED, OVERDUE status) */}
      {['SENT', 'VIEWED', 'OVERDUE'].includes(invoice.status) && (
        <form action={sendAction}>
          <button
            type="submit"
            disabled={isSending}
            className="px-4 py-2 bg-[var(--surface-2)] text-[var(--text)] rounded-lg text-sm font-medium hover:bg-[var(--accent-subtle)] transition-colors disabled:opacity-50"
          >
            {isSending ? 'Sending...' : 'Resend'}
          </button>
        </form>
      )}

      {/* Status Dropdown (for manual status changes) */}
      <select
        value={invoice.status}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isUpdating}
        aria-label="Invoice status"
        className="px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] text-sm"
      >
        <option value="DRAFT">Draft</option>
        <option value="SENT">Sent</option>
        <option value="VIEWED">Viewed</option>
        <option value="PAID">Paid</option>
        <option value="OVERDUE">Overdue</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {/* Delete (only for DRAFT or CANCELLED) */}
      {['DRAFT', 'CANCELLED'].includes(invoice.status) && (
        <form action={deleteAction}>
          <button
            type="submit"
            disabled={isDeleting}
            className="px-3 py-2 text-[var(--error-text)] hover:text-red-500 text-sm disabled:opacity-50"
            onClick={(e) => {
              if (!confirm('Are you sure you want to delete this invoice?')) {
                e.preventDefault()
              }
            }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </form>
      )}

      {/* Error Messages */}
      {(sendState?.error || statusState?.error || deleteState?.error) && (
        <p className="text-sm text-[var(--error-text)]">
          {sendState?.error || statusState?.error || deleteState?.error}
        </p>
      )}
    </div>
  )
}
