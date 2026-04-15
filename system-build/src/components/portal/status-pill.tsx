// StatusPill — portal-wide status indicator
//
// One component, every domain. Pass a LabelDomain + the raw enum value,
// and the pill renders: tone-aware icon + translated text + aria-label.
//
// Rule: status is never color-only. Every pill carries an icon AND the
// translated word. Screen readers get the full label via the wrapping
// span's accessible name.

import { labelFor, type LabelDomain, type LabelTone } from '@/lib/portal/labels'

interface StatusPillProps {
  domain: LabelDomain
  value: string
  /** Optional size variant. `sm` is the default, matches the existing pill. */
  size?: 'sm' | 'md'
  /** Optional className passthrough for one-off placement tweaks. */
  className?: string
}

const toneClasses: Record<LabelTone, string> = {
  neutral: 'bg-[var(--surface-2)] text-[var(--text-muted)]',
  active: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  action: 'bg-[var(--accent-muted)] text-[var(--accent)]',
  positive: 'bg-[var(--success-bg)] text-[var(--success-text)]',
  warning: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
}

const sizeClasses: Record<'sm' | 'md', string> = {
  sm: 'px-3 py-1 text-xs gap-1.5',
  md: 'px-3.5 py-1.5 text-sm gap-2',
}

export function StatusPill({
  domain,
  value,
  size = 'sm',
  className = '',
}: StatusPillProps) {
  const { text, tone, srLabel } = labelFor(domain, value)
  return (
    <span
      role="status"
      aria-label={srLabel ?? text}
      className={`
        inline-flex items-center rounded-full
        font-medium uppercase tracking-wide
        ${sizeClasses[size]}
        ${toneClasses[tone]}
        ${className}
      `.trim()}
    >
      <ToneIcon tone={tone} />
      <span>{text}</span>
    </span>
  )
}

function ToneIcon({ tone }: { tone: LabelTone }) {
  const common = 'w-3 h-3 flex-shrink-0'
  switch (tone) {
    case 'positive':
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'action':
      // Right-pointing arrow — "over to you"
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'warning':
      // Alert triangle — "attention"
      return (
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={common}
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l6.28 11.17A2 2 0 0116.28 17H3.72a2 2 0 01-1.743-2.73L8.257 3.1zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      )
    case 'active':
      // Filled dot — "in motion"
      return (
        <span
          aria-hidden="true"
          className={`${common} rounded-full bg-current`}
          style={{ transform: 'scale(0.55)' }}
        />
      )
    case 'neutral':
    default:
      // Ring — "steady"
      return (
        <span
          aria-hidden="true"
          className={`${common} rounded-full border border-current`}
          style={{ transform: 'scale(0.55)' }}
        />
      )
  }
}
