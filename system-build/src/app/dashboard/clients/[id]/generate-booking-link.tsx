'use client'

// Generate Booking Link Button - For routed clients to access gated Calendly scheduling
import { useState } from 'react'

interface GenerateBookingLinkProps {
  clientId: string
  clientName: string
  assignedPath: string
}

const PATH_LABELS: Record<string, string> = {
  FOCUS_STUDIO: 'Focus Studio Kickoff',
  CORE_SERVICES: 'Core Services Discovery',
}

const PATH_COLORS: Record<string, string> = {
  FOCUS_STUDIO: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  CORE_SERVICES: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
}

export function GenerateBookingLink({ clientId, clientName, assignedPath }: GenerateBookingLinkProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    url?: string
    expiresInHours?: number
    bookingType?: string
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const bookingLabel = PATH_LABELS[assignedPath] || assignedPath

  async function handleGenerate() {
    setIsLoading(true)
    setResult(null)
    setCopied(false)

    try {
      const response = await fetch('/api/admin/generate-booking-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setResult({ error: data.error || 'Failed to generate link' })
      } else {
        setResult({
          url: data.url,
          expiresInHours: data.expiresInHours,
          bookingType: data.bookingType,
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
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          Generate a one-time booking link for {clientName} to schedule their call.
        </p>
        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded border ${PATH_COLORS[assignedPath] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30'}`}>
          {bookingLabel}
        </span>
      </div>

      {!result?.url && (
        <button
          onClick={handleGenerate}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm font-medium text-[var(--text)] bg-[var(--surface-2)] rounded-lg hover:bg-[var(--accent-subtle)] disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Generating...' : 'Generate Booking Link'}
        </button>
      )}

      {result?.error && (
        <div className="p-3 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg">
          <p className="text-sm text-[var(--error-text)]">{result.error}</p>
        </div>
      )}

      {result?.url && (
        <div className="space-y-3">
          <div className="p-3 bg-[var(--success-bg)] border border-[var(--success-border)] rounded-lg">
            <p className="text-xs text-[var(--success-text)] mb-2">
              Booking link generated! Expires in {result.expiresInHours} hours. Send this to the client.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.url}
                className="flex-1 px-2 py-1.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded font-mono truncate"
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
            className="w-full px-3 py-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            Generate New Link
          </button>
        </div>
      )}
    </div>
  )
}
