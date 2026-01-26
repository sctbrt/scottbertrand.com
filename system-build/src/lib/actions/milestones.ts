'use server'

// Server Actions for Milestone Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { MilestoneStatus } from '@prisma/client'

export type MilestoneActionState = {
  error?: string
  success?: boolean
} | null

export async function createMilestone(
  projectId: string,
  prevState: MilestoneActionState,
  formData: FormData
): Promise<MilestoneActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const dueDate = formData.get('dueDate') as string | null
  const requiresApproval = formData.get('requiresApproval') === 'true'

  if (!name) {
    return { error: 'Milestone name is required' }
  }

  try {
    // Get max sort order
    const lastMilestone = await prisma.milestones.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    await prisma.milestones.create({
      data: {
        projectId,
        name,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        requiresApproval,
        sortOrder: (lastMilestone?.sortOrder ?? -1) + 1,
      },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/portal/projects/${projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error creating milestone:', error)
    return { error: 'Failed to create milestone' }
  }
}

export async function updateMilestone(
  milestoneId: string,
  prevState: MilestoneActionState,
  formData: FormData
): Promise<MilestoneActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string | null
  const status = formData.get('status') as MilestoneStatus | null
  const dueDate = formData.get('dueDate') as string | null
  const requiresApproval = formData.get('requiresApproval') === 'true'

  if (!name) {
    return { error: 'Milestone name is required' }
  }

  try {
    const milestone = await prisma.milestones.findUnique({
      where: { id: milestoneId },
      select: { projectId: true, status: true },
    })

    if (!milestone) {
      return { error: 'Milestone not found' }
    }

    // Determine completed and approved dates
    let completedAt: Date | null = null
    let approvedAt: Date | null = null

    if (status === 'COMPLETED' && milestone.status !== 'COMPLETED') {
      completedAt = new Date()
    }
    if (status === 'APPROVED' && milestone.status !== 'APPROVED') {
      approvedAt = new Date()
    }

    await prisma.milestones.update({
      where: { id: milestoneId },
      data: {
        name,
        description: description || null,
        status: (status || milestone.status) as MilestoneStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
        requiresApproval,
        completedAt,
        approvedAt,
      },
    })

    revalidatePath(`/dashboard/projects/${milestone.projectId}`)
    revalidatePath(`/portal/projects/${milestone.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating milestone:', error)
    return { error: 'Failed to update milestone' }
  }
}

export async function updateMilestoneStatus(
  milestoneId: string,
  prevState: MilestoneActionState,
  formData: FormData
): Promise<MilestoneActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const status = formData.get('status') as MilestoneStatus

  if (!status) {
    return { error: 'Status is required' }
  }

  try {
    const milestone = await prisma.milestones.findUnique({
      where: { id: milestoneId },
      select: { projectId: true, status: true },
    })

    if (!milestone) {
      return { error: 'Milestone not found' }
    }

    // Determine completed and approved dates
    let completedAt: Date | null = null
    let approvedAt: Date | null = null

    if (status === 'COMPLETED' && milestone.status !== 'COMPLETED') {
      completedAt = new Date()
    }
    if (status === 'APPROVED' && milestone.status !== 'APPROVED') {
      approvedAt = new Date()
    }

    await prisma.milestones.update({
      where: { id: milestoneId },
      data: {
        status: status as MilestoneStatus,
        completedAt,
        approvedAt,
      },
    })

    revalidatePath(`/dashboard/projects/${milestone.projectId}`)
    revalidatePath(`/portal/projects/${milestone.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating milestone status:', error)
    return { error: 'Failed to update milestone status' }
  }
}

export async function deleteMilestone(
  milestoneId: string,
  _prevState: MilestoneActionState,
  _formData: FormData
): Promise<MilestoneActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const milestone = await prisma.milestones.findUnique({
      where: { id: milestoneId },
      select: { projectId: true },
    })

    if (!milestone) {
      return { error: 'Milestone not found' }
    }

    await prisma.milestones.delete({
      where: { id: milestoneId },
    })

    revalidatePath(`/dashboard/projects/${milestone.projectId}`)
    revalidatePath(`/portal/projects/${milestone.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting milestone:', error)
    return { error: 'Failed to delete milestone' }
  }
}
