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
  onToggleMobileNav?: () => void
}

export function DashboardHeader({ user, onToggleMobileNav }: DashboardHeaderProps) {
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
          {/* Left: Hamburger + Logo / Brand */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              onClick={onToggleMobileNav}
              className="lg:hidden p-2 -ml-2 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] rounded-lg transition-colors"
              aria-label="Toggle navigation"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            <a
              href="https://bertrandbrands.ca"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity shrink-0"
              aria-label="Bertrand Brands"
            >
              <Image
                src="/dot-logomark.svg"
                alt=""
                width={22}
                height={22}
                className="h-[22px] w-[22px] invert"
                priority
              />
              {/* Full brand name - hidden on mobile */}
              <span className="hidden sm:block text-lg font-medium tracking-tight text-[var(--text)] font-display">
                BERTRAND BRANDS
              </span>
            </a>
            {/* Full breadcrumb - desktop only */}
            <span className="hidden md:block text-[var(--text-muted)]">|</span>
            <span className="hidden md:block text-base font-medium tracking-tight text-[var(--accent)]">
              CRM
            </span>
            <span className="hidden lg:block text-[var(--text-muted)]">|</span>
            <span className="hidden lg:block text-base font-medium tracking-tight text-[var(--text)]">
              {currentSection}
            </span>
            {/* Mobile: Just show current section */}
            <span className="lg:hidden text-sm font-medium tracking-tight text-[var(--accent)] truncate">
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
