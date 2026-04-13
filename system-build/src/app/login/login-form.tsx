'use client'

// Login Form Component - Client-side form with rate limiting
import { useState, useTransition } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'

interface LoginFormProps {
  callbackUrl?: string
  isDev?: boolean
}

export function LoginForm({ callbackUrl, isDev }: LoginFormProps) {
  const [email, setEmail] = useState('')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [attempts, setAttempts] = useState(0)
  const [lastAttempt, setLastAttempt] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Client-side rate limiting (3 attempts per 60 seconds)
    const now = Date.now()
    if (lastAttempt && now - lastAttempt < 60000 && attempts >= 3) {
      setError('Too many attempts. Please wait a moment and try again.')
      return
    }

    // Reset attempts counter if enough time has passed
    if (lastAttempt && now - lastAttempt >= 60000) {
      setAttempts(0)
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.')
      return
    }

    startTransition(async () => {
      try {
        setAttempts(prev => prev + 1)
        setLastAttempt(now)

        console.log('[LoginForm] Calling signIn with email:', email)
        const result = await signIn('resend', {
          email,
          callbackUrl: callbackUrl || '/',
          redirect: false,
        })
        console.log('[LoginForm] signIn result:', JSON.stringify(result))

        if (result?.error) {
          console.error('[LoginForm] signIn error:', result.error)
          // Neutral response - don't reveal if account exists
          setError('Unable to send sign-in link. Please try again.')
        } else if (result?.ok) {
          // Redirect to verify page
          window.location.href = '/login/verify?email=' + encodeURIComponent(email)
        } else {
          console.error('[LoginForm] Unexpected result:', result)
          setError('Unable to send sign-in link. Please try again.')
        }
      } catch (err) {
        console.error('[LoginForm] Exception:', err)
        setError('An unexpected error occurred. Please try again.')
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--text)] mb-2"
        >
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isPending}
          className="w-full px-4 py-3 border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)] placeholder-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          placeholder="you@example.com"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending || !email}
        className="w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {isPending && <Spinner size="sm" />}
        {isPending ? 'Sending...' : 'Send Sign-In Link'}
      </button>

      <p className="text-xs text-[var(--text-muted)] text-center">
        You&apos;ll receive a secure link to sign in. No password required.
      </p>

      {isDev && (
        <div className="pt-4 border-t border-[var(--border)]">
          <Link
            href="/api/auth/dev-login"
            className="block w-full py-3 px-4 bg-[var(--accent)] text-white rounded-lg font-medium hover:bg-[var(--accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent)] transition-colors text-center"
          >
            Dev Login (Bypass Email)
          </Link>
          <p className="text-xs text-[var(--accent)] text-center mt-2">
            Development only — bypasses email verification
          </p>
        </div>
      )}
    </form>
  )
}
