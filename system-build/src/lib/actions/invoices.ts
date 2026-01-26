'use server'

// Server Actions for Invoice Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { Resend } from 'resend'
import type { InvoiceStatus } from '@prisma/client'

const resend = new Resend(process.env.RESEND_API_KEY)

// HTML escape helper to prevent XSS in email templates
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}

export type InvoiceActionState = {
  error?: string
  success?: boolean
} | null

export async function createInvoice(
  prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const invoiceNumber = formData.get('invoiceNumber') as string
  const clientId = formData.get('clientId') as string
  const projectId = formData.get('projectId') as string | null
  const dueDate = formData.get('dueDate') as string | null
  const lineItems = formData.get('lineItems') as string
  const subtotal = parseFloat(formData.get('subtotal') as string) || 0
  const tax = parseFloat(formData.get('tax') as string) || 0
  const total = parseFloat(formData.get('total') as string) || 0
  const notes = formData.get('notes') as string | null

  if (!invoiceNumber || !clientId) {
    return { error: 'Invoice number and client are required' }
  }

  try {
    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { error: 'Client not found' }
    }

    // Parse line items
    let parsedLineItems = []
    try {
      parsedLineItems = JSON.parse(lineItems)
    } catch {
      return { error: 'Invalid line items format' }
    }

    // Create invoice
    const invoice = await prisma.invoices.create({
      data: {
        invoiceNumber,
        clientId,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        lineItems: parsedLineItems,
        subtotal,
        tax,
        total,
        notes: notes || null,
        status: 'DRAFT',
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Invoice',
        entityId: invoice.id,
        details: { invoiceNumber, clientId, total },
      },
    })

    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/clients/${clientId}`)
    if (projectId) {
      revalidatePath(`/dashboard/projects/${projectId}`)
    }
    redirect(`/dashboard/invoices/${invoice.id}`)
  } catch (error) {
    console.error('Error creating invoice:', error)
    return { error: 'Failed to create invoice' }
  }
}

export async function updateInvoice(
  invoiceId: string,
  prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const clientId = formData.get('clientId') as string
  const projectId = formData.get('projectId') as string | null
  const dueDate = formData.get('dueDate') as string | null
  const lineItems = formData.get('lineItems') as string
  const subtotal = parseFloat(formData.get('subtotal') as string) || 0
  const tax = parseFloat(formData.get('tax') as string) || 0
  const total = parseFloat(formData.get('total') as string) || 0
  const notes = formData.get('notes') as string | null

  if (!clientId) {
    return { error: 'Client is required' }
  }

  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return { error: 'Invoice not found' }
    }

    // Only allow editing draft invoices
    if (invoice.status !== 'DRAFT') {
      return { error: 'Only draft invoices can be edited' }
    }

    // Parse line items
    let parsedLineItems = []
    try {
      parsedLineItems = JSON.parse(lineItems)
    } catch {
      return { error: 'Invalid line items format' }
    }

    await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        clientId,
        projectId: projectId || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        lineItems: parsedLineItems,
        subtotal,
        tax,
        total,
        notes: notes || null,
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Invoice',
        entityId: invoiceId,
        details: { total },
      },
    })

    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    revalidatePath('/dashboard/invoices')

    return { success: true }
  } catch (error) {
    console.error('Error updating invoice:', error)
    return { error: 'Failed to update invoice' }
  }
}

export async function updateInvoiceStatus(
  invoiceId: string,
  prevState: InvoiceActionState,
  formData: FormData
): Promise<InvoiceActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const status = formData.get('status') as InvoiceStatus

  if (!status) {
    return { error: 'Status is required' }
  }

  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return { error: 'Invoice not found' }
    }

    // Set paidAt if marking as paid
    const paidAt = status === 'PAID' && invoice.status !== 'PAID' ? new Date() : invoice.paidAt

    await prisma.invoices.update({
      where: { id: invoiceId },
      data: {
        status: status as InvoiceStatus,
        paidAt,
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_STATUS',
        entityType: 'Invoice',
        entityId: invoiceId,
        details: { status },
      },
    })

    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    revalidatePath('/dashboard/invoices')
    revalidatePath(`/dashboard/clients/${invoice.clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating invoice status:', error)
    return { error: 'Failed to update invoice status' }
  }
}

export async function sendInvoice(
  invoiceId: string,
  _prevState: InvoiceActionState,
  _formData: FormData
): Promise<InvoiceActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
      include: {
        clients: {
          select: { contactEmail: true, contactName: true, companyName: true },
        },
        projects: {
          select: { name: true },
        },
      },
    })

    if (!invoice) {
      return { error: 'Invoice not found' }
    }

    interface InvoiceLineItem {
      description: string
      quantity: number
      rate: number
    }
    const lineItems = (invoice.lineItems as InvoiceLineItem[] | null) || []

    // Send email via Resend
    const { error: emailError } = await resend.emails.send({
      from: 'Bertrand Brands <invoices@bertrandbrands.com>',
      to: invoice.clients.contactEmail,
      subject: `Invoice ${invoice.invoiceNumber} from Bertrand Brands`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 24px;">Invoice ${escapeHtml(invoice.invoiceNumber)}</h1>

          <p style="color: #666; margin-bottom: 24px;">
            Hi ${escapeHtml(invoice.clients.contactName)},
          </p>

          <p style="color: #666; margin-bottom: 24px;">
            Please find your invoice details below${invoice.projects ? ` for ${escapeHtml(invoice.projects.name)}` : ''}.
          </p>

          <div style="background: #f9f9f9; padding: 24px; border-radius: 8px; margin-bottom: 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #e5e5e5;">
                  <th style="text-align: left; padding: 8px 0; color: #666; font-weight: 500;">Description</th>
                  <th style="text-align: right; padding: 8px 0; color: #666; font-weight: 500;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${lineItems.map((item: InvoiceLineItem) => `
                  <tr style="border-bottom: 1px solid #e5e5e5;">
                    <td style="padding: 12px 0; color: #1a1a1a;">${escapeHtml(String(item.description || ''))}</td>
                    <td style="padding: 12px 0; color: #1a1a1a; text-align: right;">$${(Number(item.quantity) * Number(item.rate)).toFixed(2)}</td>
                  </tr>
                `).join('')}
              </tbody>
              <tfoot>
                <tr>
                  <td style="padding: 12px 0; font-weight: 600; color: #1a1a1a;">Total</td>
                  <td style="padding: 12px 0; font-weight: 600; color: #1a1a1a; text-align: right;">$${Number(invoice.total).toFixed(2)} CAD</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${invoice.dueDate ? `
            <p style="color: #666; margin-bottom: 24px;">
              <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          ` : ''}

          <p style="color: #666; margin-bottom: 24px;">
            You can view your invoice and project details in your client portal:
          </p>

          <a href="https://clients.bertrandbrands.com/portal" style="display: inline-block; background: #1a1a1a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
            View Client Portal
          </a>

          <p style="color: #999; font-size: 14px; margin-top: 32px;">
            If you have any questions, please reply to this email.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />

          <p style="color: #999; font-size: 12px;">
            Bertrand Brands · bertrandbrands.com
          </p>
        </div>
      `,
    })

    if (emailError) {
      console.error('Error sending invoice email:', emailError)
      return { error: 'Failed to send invoice email' }
    }

    // Update invoice status to SENT
    await prisma.invoices.update({
      where: { id: invoiceId },
      data: { status: 'SENT' },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'SEND',
        entityType: 'Invoice',
        entityId: invoiceId,
        details: { sentTo: invoice.clients.contactEmail },
      },
    })

    revalidatePath(`/dashboard/invoices/${invoiceId}`)
    revalidatePath('/dashboard/invoices')

    return { success: true }
  } catch (error) {
    console.error('Error sending invoice:', error)
    return { error: 'Failed to send invoice' }
  }
}

export async function deleteInvoice(
  invoiceId: string,
  _prevState: InvoiceActionState,
  _formData: FormData
): Promise<InvoiceActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const invoice = await prisma.invoices.findUnique({
      where: { id: invoiceId },
    })

    if (!invoice) {
      return { error: 'Invoice not found' }
    }

    // Only allow deleting draft or cancelled invoices
    if (!['DRAFT', 'CANCELLED'].includes(invoice.status)) {
      return { error: 'Only draft or cancelled invoices can be deleted' }
    }

    await prisma.invoices.delete({
      where: { id: invoiceId },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Invoice',
        entityId: invoiceId,
      },
    })

    revalidatePath('/dashboard/invoices')
    redirect('/dashboard/invoices')
  } catch (error) {
    console.error('Error deleting invoice:', error)
    return { error: 'Failed to delete invoice' }
  }
}
