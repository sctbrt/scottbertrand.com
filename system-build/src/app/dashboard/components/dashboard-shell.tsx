'use client'

// Dashboard Shell - manages mobile nav state between header and sidebar
// Forces dark theme for admin dashboard (glass aesthetic requires dark mode)
import { useState, useEffect } from 'react'
import { DashboardHeader } from './dashboard-header'
import { DashboardNav } from './dashboard-nav'
import type { Role } from '@prisma/client'

interface DashboardShellProps {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
  }
  counts?: {
    leads?: number
    invoices?: number
    intakes?: number
    careTickets?: number
  }
  children: React.ReactNode
}

export function DashboardShell({ user, counts, children }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Force dark theme — BB is dark-only across the ecosystem (root layout already
  // hardcodes this; the redundancy here is defense-in-depth for any client-only render path).
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
  }, [])

  return (
    <div className="min-h-screen relative">
      {/* V13 ambient breathing glow */}
      <div className="ambient-glow ambient-glow--top-right" aria-hidden="true" />
      <DashboardHeader
        user={user}
        onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
      />

      <div className="flex">
        <DashboardNav
          counts={counts}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
