// Auth Error Page
import Image from 'next/image'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = await searchParams
  const error = params.error

  const errorMessages: Record<string, { title: string; description: string }> = {
    Configuration: {
      title: 'Server Configuration Error',
      description: 'There is a problem with the server configuration. Please contact support.',
    },
    AccessDenied: {
      title: 'Access Denied',
      description: 'You do not have permission to sign in.',
    },
    Verification: {
      title: 'Link Expired or Invalid',
      description: 'The sign-in link has expired or has already been used. Please request a new one.',
    },
    Default: {
      title: 'Authentication Error',
      description: 'An error occurred during sign in. Please try again.',
    },
  }

  const { title, description } = errorMessages[error || 'Default'] || errorMessages.Default

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] px-4">
      {/* Header with Logo */}
      <header className="w-full py-6 px-4 sm:px-6">
        <a
          href="https://bertrandbrands.ca"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 hover:opacity-80 transition-opacity"
          aria-label="Bertrand Brands"
        >
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
        </a>
      </header>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
        <div className="bg-[var(--surface)] rounded-lg shadow-sm border border-[var(--border)] p-8 text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          <h1 className="text-xl font-medium text-[var(--text)] mb-2">
            {title}
          </h1>

          <p className="text-sm text-[var(--text-muted)] mb-6">
            {description}
          </p>

          <a
            href="/login"
            className="inline-block w-full py-3 px-4 bg-[var(--text)] text-[var(--bg)] rounded-lg font-medium hover:opacity-90 transition-colors text-center"
          >
            Try Again
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
