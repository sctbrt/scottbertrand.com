'use server'

// Server Actions for Lead Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { LeadStatus } from '@prisma/client'

export type LeadActionState = {
  error?: string
  success?: boolean
} | null

export async function updateLeadStatus(
  leadId: string,
  prevState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const status = formData.get('status') as LeadStatus

  if (!status) {
    return { error: 'Status is required' }
  }

  try {
    await prisma.leads.update({
      where: { id: leadId },
      data: { status: status as LeadStatus },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE_STATUS',
        entityType: 'Lead',
        entityId: leadId,
        details: { status },
      },
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads')

    return { success: true }
  } catch (error) {
    console.error('Error updating lead status:', error)
    return { error: 'Failed to update lead status' }
  }
}

export async function markAsSpam(
  leadId: string,
  _prevState: LeadActionState,
  _formData: FormData
): Promise<LeadActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    await prisma.leads.update({
      where: { id: leadId },
      data: {
        isSpam: true,
        status: 'DISQUALIFIED',
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'MARK_SPAM',
        entityType: 'Lead',
        entityId: leadId,
      },
    })

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads')

    return { success: true }
  } catch (error) {
    console.error('Error marking lead as spam:', error)
    return { error: 'Failed to mark lead as spam' }
  }
}

export async function deleteLead(
  leadId: string,
  _prevState: LeadActionState,
  _formData: FormData
): Promise<LeadActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const lead = await prisma.leads.findUnique({
      where: { id: leadId },
    })

    if (!lead) {
      return { error: 'Lead not found' }
    }

    // Prevent deletion of converted leads
    if (lead.status === 'CONVERTED' || lead.convertedToClientId) {
      return { error: 'Cannot delete converted leads' }
    }

    await prisma.leads.delete({
      where: { id: leadId },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Lead',
        entityId: leadId,
      },
    })

    revalidatePath('/dashboard/leads')
    redirect('/dashboard/leads')
  } catch (error) {
    console.error('Error deleting lead:', error)
    return { error: 'Failed to delete lead' }
  }
}

export async function convertToClient(
  leadId: string,
  prevState: LeadActionState,
  formData: FormData
): Promise<LeadActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const contactName = formData.get('contactName') as string
  const companyName = formData.get('companyName') as string | null
  const createProject = formData.get('createProject') === 'true'
  const projectName = formData.get('projectName') as string
  const templateId = formData.get('templateId') as string | null

  if (!contactName) {
    return { error: 'Contact name is required' }
  }

  let clientId: string | null = null

  try {
    // Use transaction to prevent race conditions
    const result = await prisma.$transaction(async (tx) => {
      const lead = await tx.leads.findUnique({
        where: { id: leadId },
      })

      if (!lead) {
        throw new Error('Lead not found')
      }

      if (lead.status === 'CONVERTED' || lead.convertedToClientId) {
        throw new Error('Lead is already converted')
      }

      // Check if user with this email already exists
      let user = await tx.users.findUnique({
        where: { email: lead.email.toLowerCase() },
      })

      if (user) {
        // Check if they already have a client profile
        const existingClient = await tx.clients.findUnique({
          where: { userId: user.id },
        })

        if (existingClient) {
          throw new Error('A client with this email already exists')
        }
      } else {
        // Create new user
        user = await tx.users.create({
          data: {
            email: lead.email.toLowerCase(),
            name: contactName,
            role: 'CLIENT',
          },
        })
      }

      // Create client
      const client = await tx.clients.create({
        data: {
          userId: user.id,
          contactName,
          contactEmail: lead.email.toLowerCase(),
          companyName: companyName || null,
          phone: lead.phone || null,
          website: lead.website || null,
        },
      })

      // Update lead
      await tx.leads.update({
        where: { id: leadId },
        data: {
          status: 'CONVERTED',
          convertedToClientId: client.id,
        },
      })

      // Create initial project if requested
      let projectId = null
      if (createProject && projectName) {
        // Get default checklist from template if selected
        let defaultTasks: { title: string; description?: string }[] = []
        if (templateId) {
          const template = await tx.service_templates.findUnique({
            where: { id: templateId },
          })
          if (template?.checklistItems) {
            defaultTasks = template.checklistItems as typeof defaultTasks
          }
        }

        const project = await tx.projects.create({
          data: {
            name: projectName,
            clientId: client.id,
            serviceTemplateId: templateId || null,
            status: 'DRAFT',
          },
        })

        projectId = project.id

        // Create default tasks
        if (defaultTasks.length > 0) {
          await tx.tasks.createMany({
            data: defaultTasks.map((task, index) => ({
              projectId: project.id,
              title: task.title,
              description: task.description || null,
              sortOrder: index,
              isClientVisible: true,
            })),
          })
        }
      }

      // Log activity
      await tx.activity_logs.create({
        data: {
          userId: session.user.id,
          action: 'CONVERT',
          entityType: 'Lead',
          entityId: leadId,
          details: {
            clientId: client.id,
            projectId,
          },
        },
      })

      return { clientId: client.id }
    })

    clientId = result.clientId

    revalidatePath(`/dashboard/leads/${leadId}`)
    revalidatePath('/dashboard/leads')
    revalidatePath('/dashboard/clients')
    revalidatePath('/dashboard')

    redirect(`/dashboard/clients/${clientId}`)
  } catch (error) {
    console.error('Error converting lead to client:', error)
    // Return specific error messages from transaction
    if (error instanceof Error) {
      return { error: error.message }
    }
    return { error: 'Failed to convert lead to client' }
  }
}
