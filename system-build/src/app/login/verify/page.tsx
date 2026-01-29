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

          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            Check your email
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            A sign-in link has been sent to{' '}
            <span className="font-medium text-gray-700 dark:text-gray-300">
              {decodeURIComponent(email)}
            </span>
          </p>

          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              The link will expire in <strong>15 minutes</strong>. If you don&apos;t see the email, check your spam folder.
            </p>
          </div>

          <a
            href="/login"
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            ← Back to sign in
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
