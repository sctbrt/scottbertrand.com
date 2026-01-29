'use client'

// Client Portal Header - V3 Glass Aesthetic
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

interface PortalHeaderProps {
  user: {
    id: string
    email: string
    name?: string | null
    role: Role
  }
  clientName: string
}

const navItems = [
  { name: 'Projects', href: '/portal' },
  { name: 'Invoices', href: '/portal/invoices' },
]

export function PortalHeader({ user, clientName }: PortalHeaderProps) {
  const pathname = usePathname()

  // Determine current section for breadcrumb
  const currentSection = pathname.startsWith('/portal/invoices') ? 'Invoices' : 'Projects'

  return (
    <header className="glass glass--header sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/portal" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/bertrand-brands-logomark.png"
                alt=""
                width={24}
                height={24}
                className="h-6 w-6 brightness-0 invert"
                priority
              />
              <span className="hidden sm:inline text-lg font-medium tracking-tight text-[var(--text)]">
                BERTRAND BRANDS
              </span>
            </Link>
            <span className="text-[var(--text-muted)] hidden sm:inline">|</span>
            <span className="text-sm sm:text-base font-medium tracking-tight text-amber-600 dark:text-amber-400">
              Client Portal
            </span>
            <span className="text-[var(--text-muted)] hidden sm:inline">|</span>
            <span className="text-base font-medium tracking-tight text-[var(--text)] hidden sm:inline">
              {currentSection}
            </span>
          </div>

          {/* Navigation - Mobile */}
          <nav className="sm:hidden flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.href === '/portal'
                ? pathname === '/portal'
                : pathname.startsWith(item.href)

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                      : 'text-[var(--text-muted)] hover:bg-[var(--accent-subtle)] hover:text-[var(--text)]'
                  }`}
                >
                  {item.name}
                </Link>
              )
            })}
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-2 py-1.5 text-[var(--text-muted)] hover:text-[var(--accent)] rounded-lg transition-colors"
              aria-label="Sign Out"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </nav>

          {/* User Menu */}
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--text)]">
                {clientName}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {user.email}
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
