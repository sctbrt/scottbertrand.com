'use client'

// Client Portal Header - V3 Glass Aesthetic
import Link from 'next/link'
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

  return (
    <header className="glass glass--header">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo / Brand */}
          <div className="flex items-center gap-6">
            <Link href="/portal" className="flex items-center gap-3">
              <span className="text-lg font-medium text-[var(--text)]">
                Bertrand Brands
              </span>
              <span className="text-[var(--border-hover)]">|</span>
              <span className="text-sm text-[var(--text-muted)]">
                Client Portal
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden sm:flex items-center gap-1">
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
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
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
