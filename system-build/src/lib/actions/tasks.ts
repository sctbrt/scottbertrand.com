'use server'

// Server Actions for Task Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import type { TaskStatus } from '@prisma/client'

export type TaskActionState = {
  error?: string
  success?: boolean
} | null

export async function createTask(
  projectId: string,
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const dueDate = formData.get('dueDate') as string | null
  const isClientVisible = formData.get('isClientVisible') === 'true'

  if (!title) {
    return { error: 'Task title is required' }
  }

  try {
    // Get max sort order
    const lastTask = await prisma.tasks.findFirst({
      where: { projectId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    await prisma.tasks.create({
      data: {
        projectId,
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        isClientVisible,
        sortOrder: (lastTask?.sortOrder ?? -1) + 1,
      },
    })

    revalidatePath(`/dashboard/projects/${projectId}`)
    revalidatePath(`/portal/projects/${projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error creating task:', error)
    return { error: 'Failed to create task' }
  }
}

export async function updateTask(
  taskId: string,
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const title = formData.get('title') as string
  const description = formData.get('description') as string | null
  const status = formData.get('status') as TaskStatus | null
  const dueDate = formData.get('dueDate') as string | null
  const isClientVisible = formData.get('isClientVisible') === 'true'

  if (!title) {
    return { error: 'Task title is required' }
  }

  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { projectId: true, status: true },
    })

    if (!task) {
      return { error: 'Task not found' }
    }

    // Determine completed date
    let completedAt = null
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      completedAt = new Date()
    }

    await prisma.tasks.update({
      where: { id: taskId },
      data: {
        title,
        description: description || null,
        status: (status || task.status) as TaskStatus,
        dueDate: dueDate ? new Date(dueDate) : null,
        isClientVisible,
        completedAt,
      },
    })

    revalidatePath(`/dashboard/projects/${task.projectId}`)
    revalidatePath(`/portal/projects/${task.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating task:', error)
    return { error: 'Failed to update task' }
  }
}

export async function updateTaskStatus(
  taskId: string,
  prevState: TaskActionState,
  formData: FormData
): Promise<TaskActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const status = formData.get('status') as TaskStatus

  if (!status) {
    return { error: 'Status is required' }
  }

  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { projectId: true, status: true },
    })

    if (!task) {
      return { error: 'Task not found' }
    }

    // Determine completed date
    let completedAt: Date | null = null
    if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
      completedAt = new Date()
    }

    await prisma.tasks.update({
      where: { id: taskId },
      data: {
        status: status as TaskStatus,
        completedAt,
      },
    })

    revalidatePath(`/dashboard/projects/${task.projectId}`)
    revalidatePath(`/portal/projects/${task.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error updating task status:', error)
    return { error: 'Failed to update task status' }
  }
}

export async function deleteTask(
  taskId: string,
  _prevState: TaskActionState,
  _formData: FormData
): Promise<TaskActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const task = await prisma.tasks.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    })

    if (!task) {
      return { error: 'Task not found' }
    }

    await prisma.tasks.delete({
      where: { id: taskId },
    })

    revalidatePath(`/dashboard/projects/${task.projectId}`)
    revalidatePath(`/portal/projects/${task.projectId}`)

    return { success: true }
  } catch (error) {
    console.error('Error deleting task:', error)
    return { error: 'Failed to delete task' }
  }
}
