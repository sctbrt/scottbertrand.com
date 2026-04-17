// Login Page - Magic Link Authentication
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import Image from 'next/image'
import { LoginForm } from './login-form'

// Subdomain mapping by role (production only)
const ROLE_SUBDOMAINS: Record<string, string> = {
  INTERNAL_ADMIN: 'https://dash.bertrandbrands.ca',
  CLIENT: 'https://clients.bertrandbrands.ca',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  // Check if user is already authenticated
  const session = await auth()
  const params = await searchParams

  if (session?.user) {
    const isProduction = process.env.NODE_ENV === 'production' || !!process.env.VERCEL
    const headersList = await headers()
    const host = headersList.get('host')?.split(':')[0] || ''

    // In production, redirect to the correct subdomain for the user's role
    if (isProduction) {
      const correctBase = ROLE_SUBDOMAINS[session.user.role]
      if (correctBase) {
        const correctHost = new URL(correctBase).hostname
        const isOnCorrectDomain = host === correctHost

        if (!isOnCorrectDomain) {
          // User landed on wrong subdomain — redirect to correct one with callbackUrl
          const target = params.callbackUrl && params.callbackUrl !== '/'
            ? `${correctBase}${params.callbackUrl}`
            : correctBase
          redirect(target)
        }
      }
    }

    // On correct domain (or development), redirect normally
    redirect(params.callbackUrl || '/')
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] px-4">
      {/* Centered Login Form */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
          {/* Centered Logo */}
          <a
            href="https://bertrandbrands.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center gap-3 mb-8 hover:opacity-80 transition-opacity"
            aria-label="Bertrand Brands"
          >
            <Image
              src="/dot-logomark.svg"
              alt=""
              width={32}
              height={32}
              className="w-8 h-8 invert"
            />
            <span className="text-xs font-medium tracking-[0.15em] uppercase text-[var(--text-subtle)] font-display">
              Bertrand Brands
            </span>
          </a>

          <div className="bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] p-8">
            <div className="text-center mb-8">
              <h1 className="text-xl font-medium text-[var(--text)] mb-2">
                Sign in to continue
              </h1>
              <p className="text-sm text-[var(--text-muted)]">
                Enter your email to receive a secure sign-in link
              </p>
            </div>

          {params.error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-600 dark:text-red-400">
                {params.error === 'Verification' && 'The sign-in link has expired or is invalid.'}
                {params.error === 'AccessDenied' && 'Access denied. You may not have permission to sign in.'}
                {!['Verification', 'AccessDenied'].includes(params.error) && 'An error occurred. Please try again.'}
              </p>
            </div>
          )}

          <LoginForm callbackUrl={params.callbackUrl} isDev={process.env.NODE_ENV === 'development'} />
        </div>

          <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
            Bertrand Brands
          </p>
        </div>
      </div>
    </div>
  )
}
