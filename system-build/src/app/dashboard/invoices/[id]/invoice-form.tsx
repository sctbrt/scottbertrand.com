'use client'

// Invoice Form Component for Create/Edit
import { useActionState, useState } from 'react'
import { createInvoice, updateInvoice } from '@/lib/actions/invoices'
import type { Decimal } from '@prisma/client/runtime/library'

interface LineItem {
  description: string
  details?: string
  quantity: number
  rate: number
}

// Type for Prisma Decimal fields (can be Decimal, string, or number at runtime)
type DecimalLike = Decimal | string | number

interface InvoiceFormProps {
  invoice?: {
    id: string
    invoiceNumber: string
    clientId: string
    projectId: string | null
    status: string
    subtotal: DecimalLike
    tax: DecimalLike
    total: DecimalLike
    dueDate: Date | null
    lineItems: unknown // Prisma JsonValue - cast internally
    notes: string | null
  }
  invoiceNumber: string
  clients: {
    id: string
    companyName: string | null
    contactName: string
    contactEmail: string
  }[]
  projects: {
    id: string
    name: string
    clientId: string
  }[]
  preselectedClientId?: string
  preselectedProjectId?: string
  preselectedProject?: {
    id: string
    name: string
    service_templates: {
      name: string
      price: DecimalLike
    } | null
    project_service_instances: {
      customPrice: DecimalLike | null
      service_templates: {
        name: string
        price: DecimalLike
      }
    }[]
  } | null
}

export function InvoiceForm({
  invoice,
  invoiceNumber,
  clients,
  projects,
  preselectedClientId,
  preselectedProjectId,
  preselectedProject,
}: InvoiceFormProps) {
  const action = invoice ? updateInvoice.bind(null, invoice.id) : createInvoice
  const [state, formAction, isPending] = useActionState(action, null)

  const [clientId, setClientId] = useState(invoice?.clientId || preselectedClientId || '')
  const [projectId, setProjectId] = useState(invoice?.projectId || preselectedProjectId || '')
  const [lineItems, setLineItems] = useState<LineItem[]>(
    (invoice?.lineItems as LineItem[] | null) ||
      (preselectedProject
        ? generateLineItemsFromProject(preselectedProject)
        : [{ description: '', quantity: 1, rate: 0 }])
  )
  const [taxRate, setTaxRate] = useState(0)

  // Filter projects by selected client
  const filteredProjects = projects.filter((p) => p.clientId === clientId)

  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  // Add line item
  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, rate: 0 }])
  }

  // Remove line item
  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  // Update line item
  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    updated[index] = { ...updated[index], [field]: value }
    setLineItems(updated)
  }

  return (
    <form action={formAction} className="space-y-6">
      {/* Hidden invoice number */}
      <input type="hidden" name="invoiceNumber" value={invoiceNumber} />
      <input type="hidden" name="lineItems" value={JSON.stringify(lineItems)} />
      <input type="hidden" name="subtotal" value={subtotal} />
      <input type="hidden" name="tax" value={tax} />
      <input type="hidden" name="total" value={total} />

      {/* Client & Project */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="clientId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Client *
          </label>
          <select
            id="clientId"
            name="clientId"
            required
            value={clientId}
            onChange={(e) => {
              setClientId(e.target.value)
              setProjectId('') // Reset project when client changes
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          >
            <option value="">Select a client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.companyName || client.contactName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="projectId"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Project
          </label>
          <select
            id="projectId"
            name="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
          >
            <option value="">No project</option>
            {filteredProjects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="dueDate"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Due Date
        </label>
        <input
          type="date"
          id="dueDate"
          name="dueDate"
          defaultValue={invoice?.dueDate ? formatDateInput(invoice.dueDate) : getDefaultDueDate()}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100"
        />
      </div>

      {/* Line Items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Line Items
        </label>
        <div className="space-y-3">
          {lineItems.map((item, index) => (
            <div key={index} className="flex gap-3 items-start">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Description"
                  value={item.description}
                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
                />
              </div>
              <div className="w-20">
                <input
                  type="number"
                  placeholder="Qty"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  placeholder="Rate"
                  min="0"
                  step="0.01"
                  value={item.rate}
                  onChange={(e) => updateLineItem(index, 'rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
                />
              </div>
              <div className="w-28 py-2 text-right text-sm text-gray-700 dark:text-gray-300">
                {formatCurrency(item.quantity * item.rate)}
              </div>
              <button
                type="button"
                onClick={() => removeLineItem(index)}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addLineItem}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            + Add Line Item
          </button>
        </div>
      </div>

      {/* Tax Rate */}
      <div className="flex items-center gap-4">
        <label htmlFor="taxRate" className="text-sm text-gray-700 dark:text-gray-300">
          Tax Rate (%)
        </label>
        <input
          type="number"
          id="taxRate"
          min="0"
          max="100"
          step="0.01"
          value={taxRate}
          onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
          className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 text-sm"
        />
      </div>

      {/* Totals */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(subtotal)}</span>
          </div>
          {taxRate > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Tax ({taxRate}%)</span>
              <span className="text-gray-900 dark:text-gray-100">{formatCurrency(tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t border-gray-200 dark:border-gray-600">
            <span className="text-gray-900 dark:text-gray-100">Total</span>
            <span className="text-gray-900 dark:text-gray-100">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Notes
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          defaultValue={invoice?.notes || ''}
          placeholder="Payment terms, additional notes..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-100 resize-none"
        />
      </div>

      {state?.error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{state.error}</p>
        </div>
      )}

      {state?.success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-600 dark:text-green-400">
            {invoice ? 'Invoice updated successfully' : 'Invoice created successfully'}
          </p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || lineItems.length === 0 || !clientId}
        className="w-full px-4 py-2 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Saving...' : invoice ? 'Update Invoice' : 'Create Invoice'}
      </button>
    </form>
  )
}

function generateLineItemsFromProject(project: NonNullable<InvoiceFormProps['preselectedProject']>): LineItem[] {
  const items: LineItem[] = []

  // Add service template as line item
  if (project.service_templates) {
    items.push({
      description: project.service_templates.name,
      quantity: 1,
      rate: Number(project.service_templates.price) || 0,
    })
  }

  // Add service instances
  if (project.project_service_instances) {
    for (const instance of project.project_service_instances) {
      items.push({
        description: instance.service_templates.name,
        quantity: 1,
        rate: Number(instance.customPrice || instance.service_templates.price) || 0,
      })
    }
  }

  // If no items, add empty one
  if (items.length === 0) {
    items.push({ description: project.name, quantity: 1, rate: 0 })
  }

  return items
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(amount)
}

function formatDateInput(date: Date): string {
  return date.toISOString().split('T')[0]
}

function getDefaultDueDate(): string {
  const date = new Date()
  date.setDate(date.getDate() + 30) // 30 days from now
  return date.toISOString().split('T')[0]
}
