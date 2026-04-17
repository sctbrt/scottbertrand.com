// Page chrome for the public intake — dark V13 aesthetic, ambient glow, narrow reading column.

import { ReactNode } from 'react'

export function IntakeShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="ambient-glow ambient-glow--top-right" aria-hidden />
      <div className="ambient-glow" style={{ left: '-15vw', bottom: '-15vw' }} aria-hidden />

      <header className="relative z-10 border-b border-[var(--border)]">
        <div className="mx-auto max-w-[720px] px-6 py-5 flex items-center justify-between">
          <div className="font-display text-base tracking-wide text-[var(--text)]">
            BERTRAND BRANDS
          </div>
          <div className="text-xs text-[var(--text-subtle)]">Project Intake</div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-[720px] px-6 py-12 sm:py-16">
        {children}
      </main>

      <footer className="relative z-10 mx-auto max-w-[720px] px-6 py-10 text-center text-xs text-[var(--text-subtle)]">
        Questions? Email <a className="text-[var(--text-muted)] hover:text-[var(--accent)]" href="mailto:hello@bertrandbrands.ca">hello@bertrandbrands.ca</a>
      </footer>
    </div>
  )
}
