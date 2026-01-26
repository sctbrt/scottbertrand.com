'use server'

// Server Actions for Service Template Management
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export type TemplateActionState = {
  error?: string
  success?: boolean
} | null

export async function createTemplate(
  prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const description = formData.get('description') as string | null
  const price = parseFloat(formData.get('price') as string) || 0
  const estimatedDays = formData.get('estimatedDays')
    ? parseInt(formData.get('estimatedDays') as string)
    : null
  const isActive = formData.get('isActive') === 'true'
  const scope = formData.get('scope') as string
  const deliverables = formData.get('deliverables') as string
  const checklistItems = formData.get('checklistItems') as string

  if (!name || !slug) {
    return { error: 'Name and slug are required' }
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }

  try {
    // Check if slug is unique
    const existingTemplate = await prisma.service_templates.findUnique({
      where: { slug },
    })

    if (existingTemplate) {
      return { error: 'A template with this slug already exists' }
    }

    // Parse JSON arrays
    let parsedScope = []
    let parsedDeliverables = []
    let parsedChecklistItems = []

    try {
      parsedScope = JSON.parse(scope).filter((s: string) => s.trim())
      parsedDeliverables = JSON.parse(deliverables).filter((d: string) => d.trim())
      parsedChecklistItems = JSON.parse(checklistItems).filter(
        (c: { title: string }) => c.title.trim()
      )
    } catch {
      return { error: 'Invalid data format' }
    }

    // Get max sort order
    const lastTemplate = await prisma.service_templates.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    })

    const template = await prisma.service_templates.create({
      data: {
        name,
        slug,
        description: description || null,
        price,
        estimatedDays,
        isActive,
        scope: parsedScope,
        deliverables: parsedDeliverables,
        checklistItems: parsedChecklistItems,
        sortOrder: (lastTemplate?.sortOrder ?? -1) + 1,
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'CREATE',
        entityType: 'ServiceTemplate',
        entityId: template.id,
        details: { name, slug },
      },
    })

    revalidatePath('/dashboard/templates')
    redirect(`/dashboard/templates/${template.id}`)
  } catch (error) {
    console.error('Error creating template:', error)
    return { error: 'Failed to create template' }
  }
}

export async function updateTemplate(
  templateId: string,
  prevState: TemplateActionState,
  formData: FormData
): Promise<TemplateActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string
  const description = formData.get('description') as string | null
  const price = parseFloat(formData.get('price') as string) || 0
  const estimatedDays = formData.get('estimatedDays')
    ? parseInt(formData.get('estimatedDays') as string)
    : null
  const isActive = formData.get('isActive') === 'true'
  const scope = formData.get('scope') as string
  const deliverables = formData.get('deliverables') as string
  const checklistItems = formData.get('checklistItems') as string

  if (!name || !slug) {
    return { error: 'Name and slug are required' }
  }

  // Validate slug format
  const slugRegex = /^[a-z0-9-]+$/
  if (!slugRegex.test(slug)) {
    return { error: 'Slug must contain only lowercase letters, numbers, and hyphens' }
  }

  try {
    const template = await prisma.service_templates.findUnique({
      where: { id: templateId },
    })

    if (!template) {
      return { error: 'Template not found' }
    }

    // Check if slug is unique (excluding current template)
    if (slug !== template.slug) {
      const existingTemplate = await prisma.service_templates.findUnique({
        where: { slug },
      })

      if (existingTemplate) {
        return { error: 'A template with this slug already exists' }
      }
    }

    // Parse JSON arrays
    let parsedScope = []
    let parsedDeliverables = []
    let parsedChecklistItems = []

    try {
      parsedScope = JSON.parse(scope).filter((s: string) => s.trim())
      parsedDeliverables = JSON.parse(deliverables).filter((d: string) => d.trim())
      parsedChecklistItems = JSON.parse(checklistItems).filter(
        (c: { title: string }) => c.title.trim()
      )
    } catch {
      return { error: 'Invalid data format' }
    }

    await prisma.service_templates.update({
      where: { id: templateId },
      data: {
        name,
        slug,
        description: description || null,
        price,
        estimatedDays,
        isActive,
        scope: parsedScope,
        deliverables: parsedDeliverables,
        checklistItems: parsedChecklistItems,
      },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        entityType: 'ServiceTemplate',
        entityId: templateId,
        details: { name, slug },
      },
    })

    revalidatePath(`/dashboard/templates/${templateId}`)
    revalidatePath('/dashboard/templates')

    return { success: true }
  } catch (error) {
    console.error('Error updating template:', error)
    return { error: 'Failed to update template' }
  }
}

export async function deleteTemplate(templateId: string): Promise<TemplateActionState> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'INTERNAL_ADMIN') {
    return { error: 'Unauthorized' }
  }

  try {
    const template = await prisma.service_templates.findUnique({
      where: { id: templateId },
      include: {
        _count: { select: { projects: true, leads: true } },
      },
    })

    if (!template) {
      return { error: 'Template not found' }
    }

    // Prevent deletion if template is in use
    if (template._count.projects > 0 || template._count.leads > 0) {
      return { error: 'Cannot delete template with existing projects or leads. Deactivate instead.' }
    }

    await prisma.service_templates.delete({
      where: { id: templateId },
    })

    // Log activity
    await prisma.activity_logs.create({
      data: {
        userId: session.user.id,
        action: 'DELETE',
        entityType: 'ServiceTemplate',
        entityId: templateId,
      },
    })

    revalidatePath('/dashboard/templates')
    redirect('/dashboard/templates')
  } catch (error) {
    console.error('Error deleting template:', error)
    return { error: 'Failed to delete template' }
  }
}
