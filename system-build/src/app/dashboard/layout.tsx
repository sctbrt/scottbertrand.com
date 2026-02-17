// Dashboard Layout - V3 Glass Aesthetic
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from './components/dashboard-shell'

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

  // Require INTERNAL_ADMIN role — redirect wrong-role users to correct subdomain
  if (session.user.role !== 'INTERNAL_ADMIN') {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
    if (isProduction && session.user.role === 'CLIENT') {
      redirect('https://clients.bertrandgroup.ca')
    }
    redirect('/unauthorized')
  }

  // Fetch counts for nav badges
  const [newLeadsCount, unpaidInvoicesCount, submittedIntakesCount, submittedCareTicketsCount] = await Promise.all([
    prisma.leads.count({ where: { status: 'NEW' } }),
    prisma.invoices.count({ where: { status: { in: ['SENT', 'VIEWED', 'OVERDUE'] } } }),
    prisma.intake_submissions.count({ where: { status: 'SUBMITTED' } }).catch(() => 0),
    prisma.care_tickets.count({ where: { status: 'SUBMITTED' } }).catch(() => 0),
  ])

  const navCounts = {
    leads: newLeadsCount,
    invoices: unpaidInvoicesCount,
    intakes: submittedIntakesCount,
    careTickets: submittedCareTicketsCount,
  }

  return (
    <>
      {/* Force dark theme immediately — prevents flash of light theme before React hydrates */}
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.setAttribute('data-theme','dark');`,
        }}
      />
      <DashboardShell user={session.user} counts={navCounts}>
        {children}
      </DashboardShell>
    </>
  )
}
