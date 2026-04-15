// /portal/projects/[id] — LEGACY URL REDIRECT SHELL
//
// Workstream C Phase 1 collapsed the project detail surface onto the canonical
// Delivery Room at /p/[publicId]. This route exists only to preserve old email
// links and bookmarks. It does ONE job:
//
//   1. Auth check (layout already enforces CLIENT role + session).
//   2. Look up the project by the legacy DB id, confirm ownership, grab publicId.
//   3. 302 → /p/[publicId] with RedirectType.replace (no flash, no history entry).
//
// If the project doesn't exist OR the signed-in user doesn't own it, we fall
// through to notFound() rather than leaking existence of another client's project.
//
// No JSX rendered — this file's only output is the redirect.
// Previous implementation (tasks/milestones/files) violated spec §13.5's
// forbidden-surface rule; it's intentionally gone.

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect, notFound, RedirectType } from 'next/navigation'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default async function LegacyProjectRedirect({ params }: ProjectPageProps) {
  const session = await auth()
  if (!session?.user) {
    // Layout normally catches this; defensive guard in case this route is
    // somehow hit outside the portal layout.
    notFound()
  }

  const { id } = await params

  // Admins can redirect on any project. Clients only their own.
  const isAdmin = session.user.role === 'INTERNAL_ADMIN'

  let clientId: string | null = null
  if (!isAdmin) {
    const client = await prisma.clients.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })
    if (!client) notFound()
    clientId = client.id
  }

  const project = await prisma.projects.findFirst({
    where: {
      id,
      ...(isAdmin ? {} : { clientId: clientId! }),
    },
    select: { publicId: true },
  })

  if (!project) notFound()

  redirect(`/p/${project.publicId}`, RedirectType.replace)
}
