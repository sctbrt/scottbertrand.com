// Unauthorized Page - Access Denied
// Role-aware: redirects authenticated users to their correct subdomain
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Link from 'next/link'

// Subdomain mapping by role (production only)
const ROLE_SUBDOMAINS: Record<string, string> = {
  INTERNAL_ADMIN: 'https://dash.bertrandbrands.ca',
  CLIENT: 'https://clients.bertrandbrands.ca',
}

export default async function UnauthorizedPage() {
  const session = await auth()
  const headersList = await headers()
  const host = headersList.get('host')?.split(':')[0] || ''

  // If authenticated, redirect to the correct subdomain for their role
  if (session?.user?.role) {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
    const correctBase = ROLE_SUBDOMAINS[session.user.role]

    if (isProduction && correctBase) {
      const isOnCorrectDomain = host === new URL(correctBase).hostname
      if (!isOnCorrectDomain) {
        redirect(correctBase)
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-amber-600 dark:text-amber-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-medium text-[var(--text)] mb-2">
            Access Restricted
          </h1>

          <p className="text-sm text-[var(--text-muted)] mb-6">
            You don&apos;t have permission to access this area. If you believe this is an error, please contact an administrator.
          </p>

          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-colors text-center"
          >
            Sign In with Different Account
          </Link>
        </div>

        <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
          Bertrand Brands
        </p>
      </div>
    </div>
  )
}
