// Dashboard Layout - V3 Glass Aesthetic
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { DashboardNav } from './components/dashboard-nav'
import { DashboardHeader } from './components/dashboard-header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // Require authentication
  if (!session?.user) {
    redirect('/login')
  }

  // Require INTERNAL_ADMIN role
  if (session.user.role !== 'INTERNAL_ADMIN') {
    redirect('/unauthorized')
  }

  return (
    <div className="min-h-screen">
      <DashboardHeader user={session.user} />

      <div className="flex">
        <DashboardNav />

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
