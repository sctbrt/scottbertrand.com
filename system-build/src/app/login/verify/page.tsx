// Verify Email Page - Shown after magic link is sent
import Image from 'next/image'

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const params = await searchParams
  const email = params.email || 'your email'

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] px-4">
      {/* Header with Logo */}
      <header className="w-full py-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/dot-logomark.svg"
            alt=""
            width={24}
            height={24}
            className="w-6 h-6 invert"
          />
          <span className="text-sm font-medium tracking-[0.15em] uppercase text-[var(--text-subtle)] font-display">
            Bertrand Brands
          </span>
        </div>
      </header>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
        <div className="bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"
              />
            </svg>
          </div>

          <h1 className="text-xl font-medium text-[var(--text)] mb-2">
            Check your email
          </h1>

          <p className="text-sm text-[var(--text-muted)] mb-6">
            A sign-in link has been sent to{' '}
            <span className="font-medium text-[var(--text)]">
              {decodeURIComponent(email)}
            </span>
          </p>

          <div className="bg-[var(--surface-2)] rounded-lg p-4 mb-6">
            <p className="text-xs text-[var(--text-muted)]">
              The link will expire in <strong>15 minutes</strong>. If you don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <a
            href="/login"
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Back to sign in
          </a>
        </div>

          <p className="text-center text-xs text-[var(--text-subtle)] mt-6">
            Bertrand Brands
          </p>
        </div>
      </div>
    </div>
  )
}
