'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Section, Question } from '@/lib/intake/question-set'
import type { ResponseValue, Responses } from '@/lib/intake/validation'
import { QuestionRenderer } from './question-renderer'

interface Props {
  token: string
  clientFirstName: string
  projectName: string
  sections: Section[]
  estimatedMinutes: number
  initialResponses: Record<string, unknown>
  initialSection: number
  hasStarted: boolean
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const AUTOSAVE_MS = 1500

export function IntakeForm(props: Props) {
  const totalSections = props.sections.length
  const [currentIdx, setCurrentIdx] = useState<number>(() =>
    Math.min(Math.max(props.initialSection - 1, 0), totalSections - 1),
  )
  const [responses, setResponses] = useState<Responses>(() => props.initialResponses as Responses)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [issues, setIssues] = useState<string[]>([])

  // Welcome screen shown on every first visit. Prefills don't count as "started";
  // startedAt flips on first autosave.
  const [showWelcome, setShowWelcome] = useState(() => !props.hasStarted && props.initialSection === 1)

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sectionRef = useRef<HTMLDivElement>(null)

  const currentSection = props.sections[currentIdx]
  const visibleQuestions = useMemo(
    () => currentSection.questions.filter((q) => isQuestionVisible(q, responses)),
    [currentSection, responses],
  )

  const onChange = useCallback((qid: string, value: ResponseValue) => {
    setResponses((prev) => ({ ...prev, [qid]: value }))
  }, [])

  // Debounced autosave
  useEffect(() => {
    if (showWelcome || submitted) return
    if (saveTimer.current) clearTimeout(saveTimer.current)
    setSaveState('saving')
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/intake/${props.token}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ responses, currentSection: currentIdx + 1 }),
        })
        if (!res.ok) throw new Error(String(res.status))
        setSaveState('saved')
        setSavedAt(new Date())
      } catch {
        setSaveState('error')
      }
    }, AUTOSAVE_MS)
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [responses, currentIdx, props.token, showWelcome, submitted])

  // Scroll to top on section change
  useEffect(() => {
    sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [currentIdx])

  // Validate the current section's required questions before allowing forward navigation.
  // Soft block — surface issues, but allow override.
  function sectionRequiredMet(): boolean {
    return visibleQuestions
      .filter((q) => q.required)
      .every((q) => isAnswered(q, responses[q.id]))
  }

  async function handleNext() {
    setIssues([])
    if (!sectionRequiredMet()) {
      const missing = visibleQuestions
        .filter((q) => q.required && !isAnswered(q, responses[q.id]))
        .map((q) => q.id)
      setIssues(missing)
      return
    }
    if (currentIdx === totalSections - 1) {
      await handleSubmit()
    } else {
      setCurrentIdx((i) => i + 1)
    }
  }

  function handleBack() {
    setIssues([])
    if (currentIdx > 0) setCurrentIdx((i) => i - 1)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/intake/${props.token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responses }),
      })
      if (res.status === 422) {
        const data = await res.json()
        const ids = Array.isArray(data.issues) ? data.issues.map((i: { questionId: string }) => i.questionId) : []
        setIssues(ids)
        // Jump to the first incomplete section
        const firstSection = Array.isArray(data.issues) && data.issues[0]?.sectionId
        if (firstSection) setCurrentIdx(Math.max(0, firstSection - 1))
      } else if (!res.ok) {
        setSaveState('error')
      } else {
        setSubmitted(true)
      }
    } catch {
      setSaveState('error')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) return <ThanksScreen clientFirstName={props.clientFirstName} />
  if (showWelcome) {
    return (
      <WelcomeScreen
        clientFirstName={props.clientFirstName}
        projectName={props.projectName}
        estimatedMinutes={props.estimatedMinutes}
        totalSections={totalSections}
        onBegin={() => setShowWelcome(false)}
      />
    )
  }

  return (
    <div ref={sectionRef} className="space-y-8">
      <ProgressHeader
        currentIdx={currentIdx}
        totalSections={totalSections}
        sectionTitle={currentSection.title}
      />

      <div className="glass glass--card !p-7 sm:!p-9 space-y-8">
        <div className="space-y-2">
          <div className="text-[11px] tracking-[0.18em] uppercase text-[var(--accent)]">
            Section {currentSection.id} · {currentSection.estMinutes} min
          </div>
          <h1 className="font-display text-3xl text-[var(--text)]">{currentSection.title}</h1>
          <p className="text-sm text-[var(--text-muted)] italic">{currentSection.blurb}</p>
        </div>

        <div className="space-y-10">
          {visibleQuestions.map((q) => (
            <div
              key={q.id}
              className={
                issues.includes(q.id)
                  ? 'p-4 -mx-4 rounded-lg ring-1 ring-[var(--accent)] ring-offset-0 bg-[var(--accent-subtle)]/40'
                  : ''
              }
            >
              <QuestionRenderer
                question={q}
                value={responses[q.id]}
                onChange={(v) => onChange(q.id, v)}
              />
              {issues.includes(q.id) && (
                <div className="mt-2 text-xs text-[var(--accent)]">This one&apos;s required.</div>
              )}
            </div>
          ))}
        </div>

        {issues.length > 0 && (
          <div className="text-sm text-[var(--accent)]">
            A few required answers are still missing — they&apos;re highlighted above.
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentIdx === 0}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] disabled:opacity-30 disabled:hover:text-[var(--text-muted)]"
          >
            ← Back
          </button>
          <SaveIndicator state={saveState} savedAt={savedAt} />
          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] disabled:opacity-60 transition"
          >
            {currentIdx === totalSections - 1
              ? submitting
                ? 'Submitting…'
                : 'Submit'
              : 'Continue →'}
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-[var(--text-subtle)]">
        Your answers save automatically. Close the tab and come back anytime — this link works for 14 days.
      </div>
    </div>
  )
}

function ProgressHeader({
  currentIdx,
  totalSections,
  sectionTitle,
}: {
  currentIdx: number
  totalSections: number
  sectionTitle: string
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-[var(--text-subtle)]">
        <span>
          Section {currentIdx + 1} of {totalSections}
        </span>
        <span>{sectionTitle}</span>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: totalSections }, (_, i) => (
          <div
            key={i}
            className={`h-0.5 flex-1 rounded-full transition ${
              i < currentIdx
                ? 'bg-[var(--accent)]/70'
                : i === currentIdx
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function SaveIndicator({ state, savedAt }: { state: SaveState; savedAt: Date | null }) {
  if (state === 'saving') return <span className="text-[11px] text-[var(--text-subtle)]">Saving…</span>
  if (state === 'error')
    return <span className="text-[11px] text-[var(--accent)]">Save failed — your work is still in this tab.</span>
  if (state === 'saved' && savedAt) {
    return <span className="text-[11px] text-[var(--text-subtle)]">Saved · {timeAgo(savedAt)}</span>
  }
  return <span className="text-[11px] text-[var(--text-subtle)]">&nbsp;</span>
}

function WelcomeScreen({
  clientFirstName,
  projectName,
  estimatedMinutes,
  totalSections,
  onBegin,
}: {
  clientFirstName: string
  projectName: string
  estimatedMinutes: number
  totalSections: number
  onBegin: () => void
}) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <div className="text-[11px] tracking-[0.18em] uppercase text-[var(--accent)]">
          Project Intake
        </div>
        <h1 className="font-display text-4xl sm:text-5xl text-[var(--text)] leading-[1.1]">
          Welcome, {clientFirstName}.
        </h1>
        <p className="text-base text-[var(--text-muted)] leading-relaxed max-w-prose">
          This is how I get to know the shape of what we&apos;re building together for{' '}
          <span className="text-[var(--text)]">{projectName}</span>. {totalSections} short sections, about{' '}
          {estimatedMinutes} minutes total — but you don&apos;t have to do it all at once. Your answers save automatically.
        </p>
        <p className="text-base text-[var(--text-muted)] leading-relaxed max-w-prose italic">
          There are no wrong answers. &ldquo;I don&apos;t know yet&rdquo; is honest and useful.
        </p>
      </div>
      <button
        type="button"
        onClick={onBegin}
        className="px-6 py-3 rounded-lg bg-[var(--accent)] text-white font-medium hover:bg-[var(--accent-hover)] transition"
      >
        Begin →
      </button>
    </div>
  )
}

function ThanksScreen({ clientFirstName }: { clientFirstName: string }) {
  return (
    <div className="glass glass--card text-center space-y-5 py-12">
      <div className="text-[11px] tracking-[0.18em] uppercase text-[var(--accent)]">Submitted</div>
      <h1 className="font-display text-4xl text-[var(--text)]">Thank you, {clientFirstName}.</h1>
      <p className="text-base text-[var(--text-muted)] max-w-prose mx-auto">
        That&apos;s everything. I&apos;ll review your answers before our next conversation.
      </p>
      <p className="text-sm text-[var(--text-muted)] max-w-prose mx-auto italic">
        If you want to add or change anything, just let me know — I&apos;d rather get it right than get it fast.
      </p>
    </div>
  )
}

function isQuestionVisible(q: Question, responses: Responses): boolean {
  if (!q.showIf) return true
  return responses[q.showIf.questionId] === q.showIf.equals
}

function isAnswered(q: Question, value: ResponseValue | undefined): boolean {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) {
    if (q.type === 'paired-inputs') {
      const required = q.pairCount ?? 5
      const filled = (value as Array<{ brand: string; word: string }>).filter((p) => p.brand && p.word).length
      return filled >= required
    }
    if (q.type === 'word-list') {
      const required = q.wordCount ?? 3
      return (value as string[]).filter((v) => v.trim()).length >= required
    }
    const min = q.minSelect ?? 1
    return value.length >= min
  }
  return false
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  return `${minutes} min ago`
}
