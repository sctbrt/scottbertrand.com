// Delivery Room Layout - Minimal portal for project delivery
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface LayoutProps {
  children: React.ReactNode
  params: Promise<{ publicId: string }>
}

export default async function DeliveryRoomLayout({
  children,
  params,
}: LayoutProps) {
  const { publicId } = await params
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect(`/login?callbackUrl=/p/${publicId}`)
  }

  // Get project and verify access
  const project = await prisma.projects.findUnique({
    where: { publicId },
    select: {
      id: true,
      name: true,
      clientId: true,
      clients: {
        select: {
          id: true,
          userId: true,
          contactName: true,
          companyName: true,
        },
      },
    },
  })

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass glass--card text-center max-w-md">
          <h1 className="text-xl font-medium text-[var(--text)] mb-2">
            Project Not Found
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            This project does not exist or you don&apos;t have access.
          </p>
        </div>
      </div>
    )
  }

  // Access control: INTERNAL_ADMIN can access all, CLIENT can only access their projects
  const isAdmin = session.user.role === 'INTERNAL_ADMIN'
  const isOwner = project.clients.userId === session.user.id

  if (!isAdmin && !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="glass glass--card text-center max-w-md">
          <h1 className="text-xl font-medium text-[var(--text)] mb-2">
            Access Denied
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            You don&apos;t have permission to view this project.
          </p>
        </div>
      </div>
    )
  }

  const clientName = project.clients.companyName || project.clients.contactName

  return (
    <div className="min-h-screen">
      {/* Minimal header */}
      <header className="glass glass--header">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-[var(--text)]">
                Bertrand Brands
              </span>
              <span className="text-[var(--border-hover)]">|</span>
              <span className="text-sm text-[var(--text-muted)]">
                Delivery Room
              </span>
            </div>

            <Link
              href={`mailto:hello@bertrandgroup.ca?subject=Help with ${encodeURIComponent(project.name)}`}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors"
            >
              Need help?
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
