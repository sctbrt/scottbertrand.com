'use client'

// Generate Login Link Button - For clients who can't receive magic link emails
import { useState } from 'react'

interface GenerateLoginLinkProps {
  email: string
}

export function GenerateLoginLink({ email }: GenerateLoginLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    url?: string
    expiresInMinutes?: number
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleGenerate() {
    setIsLoading(true)
    setResult(null)
    setCopied(false)

    try {
      const response = await fetch('/api/admin/generate-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({ error: data.error || 'Failed to generate link' })
      } else {
        setResult({
          url: data.url,
          expiresInMinutes: data.expiresInMinutes,
        })
      }
    } catch {
      setResult({ error: 'Network error. Please try again.' })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (result?.url) {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        If the client can&apos;t receive magic link emails, generate a one-time login link to send them directly.
      </p>

      {!result?.url && (
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Login Link'}
        </button>
      )}

      {result?.error && (
        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{result.error}</p>
        </div>
      )}

      {result?.url && (
        <div className="mt-3 space-y-3">
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400 mb-2">
              Link generated! Expires in {result.expiresInMinutes} minutes.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.url}
                className="flex-1 px-2 py-1.5 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded font-mono truncate"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-1.5 text-xs font-medium bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              setResult(null)
              setCopied(false)
            }}
            className="w-full px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            Generate New Link
          </button>
        </div>
      )}
    </div>
  )
}
