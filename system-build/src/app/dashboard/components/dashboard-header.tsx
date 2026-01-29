'use client'

// Dashboard Header Component - V3 Glass Aesthetic
import { signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import type { Role } from '@prisma/client'
import { navItems } from './dashboard-nav'

interface DashboardHeaderProps {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
  }
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const pathname = usePathname()

  // Find current section from navItems
  const currentSection = navItems.find(item =>
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )?.name || 'Overview'

  return (
    <header className="glass glass--header sticky top-0 z-40">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Link href="/dashboard" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0">
              <Image
                src="/bertrand-brands-logomark.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 brightness-0 invert"
                priority
              />
              {/* Full brand name - hidden on mobile */}
              <span className="hidden sm:block text-lg font-medium tracking-tight text-[var(--text)]">
                BERTRAND BRANDS
              </span>
            </Link>
            {/* Full breadcrumb - desktop only */}
            <span className="hidden md:block text-[var(--text-muted)]">|</span>
            <span className="hidden md:block text-base font-medium tracking-tight text-amber-600 dark:text-amber-400">
              CRM
            </span>
            <span className="hidden lg:block text-[var(--text-muted)]">|</span>
            <span className="hidden lg:block text-base font-medium tracking-tight text-[var(--text)]">
              {currentSection}
            </span>
            {/* Mobile: Just show current section */}
            <span className="lg:hidden text-sm font-medium tracking-tight text-amber-600 dark:text-amber-400 truncate">
              {currentSection}
            </span>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-[var(--text)]">
                {user.name || user.email}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {user.role === 'INTERNAL_ADMIN' ? 'Admin' : 'User'}
              </p>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-2 sm:px-3 py-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors whitespace-nowrap"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
