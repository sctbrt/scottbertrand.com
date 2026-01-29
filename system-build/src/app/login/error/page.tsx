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
    <div className="min-h-screen flex flex-col bg-[#f7f6f3] dark:bg-[#1c1c1e] px-4">
      {/* Header with Logo */}
      <header className="w-full py-6 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image
            src="/bertrand-brands-logomark.png"
            alt=""
            width={32}
            height={32}
            className="w-8 h-8 brightness-0 invert opacity-60"
          />
          <Image
            src="/bertrand-brands-wordmark-light-2026.png"
            alt="Bertrand Brands"
            width={140}
            height={20}
            className="h-4 w-auto"
          />
        </div>
      </header>

      {/* Centered Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
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

          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            {description}
          </p>

          <a
            href="/login"
            className="inline-block w-full py-3 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-center"
          >
            Try Again
          </a>
        </div>

          <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
            Scott Bertrand — Brand & Web Systems
          </p>
        </div>
      </div>
    </div>
  )
}
