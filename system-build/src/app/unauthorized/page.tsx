// Unauthorized Page - Access Denied
import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f7f6f3] dark:bg-[#1c1c1e] px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-[#2c2c2e] rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-8 text-center">
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

          <h1 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
            Access Restricted
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            You don&apos;t have permission to access this area. If you believe this is an error, please contact an administrator.
          </p>

          <Link
            href="/login"
            className="inline-block w-full py-3 px-4 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors text-center"
          >
            Sign In with Different Account
          </Link>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-6">
          Bertrand Brands — Brand & Web Systems
        </p>
      </div>
    </div>
  )
}
