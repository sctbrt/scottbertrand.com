'use server'

// Server Actions for Project Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { ProjectStatus } from '@prisma/client'

export type ProjectActionState = {
  error?: string
  success?: boolean
} | null

export async function createProject(
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const clientId = formData.get('clientId') as string
  const serviceTemplateId = formData.get('serviceTemplateId') as string | null
  const description = formData.get('description') as string | null
  const startDate = formData.get('startDate') as string | null
  const targetEndDate = formData.get('targetEndDate') as string | null
  const previewUrl = formData.get('previewUrl') as string | null

  if (!name || !clientId) {
    return { error: 'Project name and client are required' }
  }

  try {
    // Verify client exists
    const client = await prisma.clients.findUnique({
      where: { id: clientId },
    })

    if (!client) {
      return { error: 'Client not found' }
    }

    // If service template selected, get its default checklist items
    let defaultTasks: { title: string; description?: string }[] = []
    if (serviceTemplateId) {
      const template = await prisma.service_templates.findUnique({
        where: { id: serviceTemplateId },
      })
      if (template?.checklistItems) {
        defaultTasks = template.checklistItems as typeof defaultTasks
      }
    }

    // Create project
    const project = await prisma.projects.create({
      data: {
        name,
        clientId,
        serviceTemplateId: serviceTemplateId || null,
        description: description || null,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        previewUrl: previewUrl || null,
        status: 'DRAFT',
      },
    })

    // Create default tasks from template
    if (defaultTasks.length > 0) {
      await prisma.tasks.createMany({
        data: defaultTasks.map((task, index) => ({
          projectId: project.id,
          title: task.title,
          description: task.description || null,
          sortOrder: index,
          isClientVisible: true,
        })),
      })
    }

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'Project',
        entityId: project.id,
        details: { name, clientId },
      },
    })

    revalidatePath('/dashboard/projects')
    revalidatePath(`/dashboard/clients/${clientId}`)
    redirect(`/dashboard/projects/${project.id}`)
  } catch (error) {
    console.error('Error creating project:', error)
    return { error: 'Failed to create project' }
  }
}

export async function updateProject(
  projectId: string,
  prevState: ProjectActionState,
  formData: FormData
): Promise<ProjectActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const clientId = formData.get('clientId') as string
  const serviceTemplateId = formData.get('serviceTemplateId') as string | null
  const description = formData.get('description') as string | null
  const status = formData.get('status') as ProjectStatus | null
  const startDate = formData.get('startDate') as string | null
  const targetEndDate = formData.get('targetEndDate') as string | null
  const previewUrl = formData.get('previewUrl') as string | null

  if (!name || !clientId) {
    return { error: 'Project name and client are required' }
  }

  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return { error: 'Project not found' }
    }

    // Determine actual end date if status is COMPLETED
    let actualEndDate = project.actualEndDate
    if (status === 'COMPLETED' && project.status !== 'COMPLETED') {
      actualEndDate = new Date()
    } else if (status !== 'COMPLETED') {
      actualEndDate = null
    }

    await prisma.projects.update({
      where: { id: projectId },
      data: {
        name,
        clientId,
        serviceTemplateId: serviceTemplateId || null,
        description: description || null,
        status: (status || project.status) as ProjectStatus,
        startDate: startDate ? new Date(startDate) : null,
        targetEndDate: targetEndDate ? new Date(targetEndDate) : null,
        actualEndDate,
        previewUrl: previewUrl || null,
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'Project',
        entityId: projectId,
        details: { name, status },
      },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath('/dashboard/projects')
    revalidatePath(`/dashboard/clients/${clientId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating project:', error)
    return { error: 'Failed to update project' }
  }
}

export async function deleteProject(projectId: string): Promise<ProjectActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        _count: { select: { invoices: true } },
      },
    })

    if (!project) {
      return { error: 'Project not found' }
    }

    // Prevent deletion if project has invoices
    if (project._count.invoices > 0) {
      return { error: 'Cannot delete project with existing invoices' }
    }

    const clientId = project.clientId

    // Delete project (cascades to tasks, milestones, files, comments)
    await prisma.projects.delete({
      where: { id: projectId },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'Project',
        entityId: projectId,
      },
    })

    revalidatePath('/dashboard/projects')
    revalidatePath(`/dashboard/clients/${clientId}`)
    redirect('/dashboard/projects')
  } catch (error) {
    console.error('Error deleting project:', error)
    return { error: 'Failed to delete project' }
  }
}
