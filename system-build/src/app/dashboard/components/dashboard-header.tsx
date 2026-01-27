'use client'

// Dashboard Header Component - V3 Glass Aesthetic
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  return (
    <header className="glass glass--header sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2">
            <span className="text-lg font-medium tracking-tight text-[var(--text)]">
              BERTRAND BRANDS
            </span>
            <span className="text-[var(--text-muted)]">|</span>
            <span className="text-lg font-medium tracking-tight text-amber-600 dark:text-amber-400">
              CRM
            </span>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--text)]">
                {user.name || user.email}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {user.role === 'INTERNAL_ADMIN' ? 'Admin' : 'User'}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
