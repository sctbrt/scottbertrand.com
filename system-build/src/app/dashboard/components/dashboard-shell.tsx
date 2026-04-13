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

  // Force dark theme for dashboard — glass aesthetic requires it
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    return () => {
      // Restore user preference when leaving dashboard
      const stored = localStorage.getItem('theme')
      if (stored === 'dark' || stored === 'light') {
        document.documentElement.setAttribute('data-theme', stored)
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
      }
    }
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
