'use client'

import { useState } from 'react'

interface Props {
  projectId: string
  clientName: string
  intakeStatus: 'NONE' | 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED'
}

const STATUS_PILL: Record<Props['intakeStatus'], { label: string; classes: string }> = {
  NONE: { label: 'Not sent', classes: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
  DRAFT: { label: 'Sent · not opened', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
  IN_PROGRESS: { label: 'In progress', classes: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  SUBMITTED: { label: 'Submitted', classes: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
}

export function GenerateIntakeLink({ projectId, clientName, intakeStatus }: Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{
    url?: string
    expiresAt?: string
    reused?: boolean
    error?: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  async function generate(force = false) {
    setIsLoading(true)
    setResult(null)
    setCopied(false)
    try {
      const res = await fetch('/api/admin/generate-intake-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, force }),
      })
      const data = await res.json()
      if (!res.ok) {
        setResult({ error: data.error ?? 'Failed to generate link' })
      } else {
        setResult({ url: data.url, expiresAt: data.expiresAt, reused: data.reused })
      }
    } catch {
      setResult({ error: 'Network error.' })
    } finally {
      setIsLoading(false)
    }
  }

  async function copyLink() {
    if (result?.url) {
      await navigator.clipboard.writeText(result.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const pill = STATUS_PILL[intakeStatus]
  const isSubmitted = intakeStatus === 'SUBMITTED'

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-[var(--text-muted)]">
          Generate a self-guided intake link for {clientName} (~20 min, 8 sections).
        </p>
        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${pill.classes}`}>
          {pill.label}
        </span>
      </div>

      {!result?.url && !isSubmitted && (
        <button
          onClick={() => generate(false)}
          disabled={isLoading}
          className="w-full px-3 py-2 text-sm font-medium text-[var(--text)] bg-[var(--surface-2)] rounded-lg hover:bg-[var(--accent-subtle)] disabled:opacity-50 transition-colors"
        >
          {isLoading ? 'Generating…' : intakeStatus === 'NONE' ? 'Generate intake link' : 'Generate new link'}
        </button>
      )}

      {isSubmitted && (
        <p className="text-xs text-[var(--text-subtle)] italic">
          Intake submitted. View responses below.
        </p>
      )}

      {result?.error && (
        <div className="p-3 bg-[var(--error-bg)] border border-[var(--error-border)] rounded-lg space-y-2">
          <p className="text-sm text-[var(--error-text)]">{result.error}</p>
          {(result.error.includes('already exists') || result.error.includes('active intake link')) && (
            <button
              onClick={() => generate(true)}
              className="text-xs underline text-[var(--error-text)]"
            >
              Invalidate existing and mint a new one
            </button>
          )}
        </div>
      )}

      {result?.reused && !result.url && (
        <div className="p-3 border border-[var(--border)] rounded-lg space-y-2 text-xs text-[var(--text-muted)]">
          An active link is still valid. We don&apos;t store the original token, so to share it again you&apos;ll need to mint a new one (which invalidates the old).
          <button
            onClick={() => generate(true)}
            className="block mt-2 text-[var(--accent)] hover:text-[var(--accent-hover)]"
          >
            Mint a new link
          </button>
        </div>
      )}

      {result?.url && (
        <div className="space-y-2">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg space-y-2">
            <p className="text-xs text-emerald-400">
              {result.reused
                ? 'Existing link returned.'
                : 'New link generated.'}{' '}
              {result.expiresAt && (
                <>Expires {new Date(result.expiresAt).toLocaleDateString()}.</>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={result.url}
                className="flex-1 px-2 py-1.5 text-xs bg-[var(--surface)] border border-[var(--border)] rounded font-mono truncate text-[var(--text)]"
              />
              <button
                onClick={copyLink}
                className="px-3 py-1.5 text-xs font-medium bg-[var(--accent)] text-white rounded hover:bg-[var(--accent-hover)] transition"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
