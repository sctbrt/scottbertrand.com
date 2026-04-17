// Renders a single question based on its type. Uncontrolled inputs would
// be simpler, but controlled inputs let us autosave on change with debounce.

'use client'

import type { Question } from '@/lib/intake/question-set'
import type { ResponseValue } from '@/lib/intake/validation'
import { ARCHETYPE_ICONS, MOOD_ICONS } from '@/lib/intake/icons'
import type { LucideIcon } from 'lucide-react'

interface Props {
  question: Question
  value: ResponseValue | undefined
  onChange: (value: ResponseValue) => void
  onToggle: (v: string) => void
}

export function QuestionRenderer({ question, value, onChange, onToggle }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block font-display text-lg text-[var(--text)] leading-snug">
          {question.prompt}
          {question.required ? null : (
            <span className="ml-2 text-xs font-normal text-[var(--text-subtle)] tracking-wide font-sans uppercase">
              optional
            </span>
          )}
        </label>
        {question.microcopy && (
          <p className="mt-1.5 text-sm text-[var(--text-muted)] italic">{question.microcopy}</p>
        )}
      </div>
      <Field question={question} value={value} onChange={onChange} onToggle={onToggle} />
    </div>
  )
}

function Field({ question, value, onChange, onToggle }: Props) {
  switch (question.type) {
    case 'text-short':
      return <TextShort question={question} value={typeof value === 'string' ? value : ''} onChange={(v) => onChange(v)} />
    case 'text-long':
      return <TextLong question={question} value={typeof value === 'string' ? value : ''} onChange={(v) => onChange(v)} />
    case 'select-one':
      return (
        <SelectOne
          question={question}
          value={typeof value === 'string' ? value : ''}
          onChange={(v) => onChange(v)}
        />
      )
    case 'multi-select-chips':
      return (
        <MultiSelectChips
          question={question}
          value={Array.isArray(value) ? (value as string[]) : []}
          onToggle={onToggle}
        />
      )
    case 'multi-select-tiles':
      return (
        <MoodTiles
          question={question}
          value={Array.isArray(value) ? (value as string[]) : []}
          onToggle={onToggle}
        />
      )
    case 'archetype-tiles':
      return (
        <ArchetypeTiles
          question={question}
          value={Array.isArray(value) ? (value as string[]) : []}
          onToggle={onToggle}
        />
      )
    case 'paired-inputs':
      return (
        <PairedInputs
          question={question}
          value={
            Array.isArray(value)
              ? (value as Array<{ brand: string; word: string }>)
              : []
          }
          onChange={(v) => onChange(v)}
        />
      )
    case 'word-list':
      return (
        <WordList
          question={question}
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={(v) => onChange(v)}
        />
      )
    default:
      return null
  }
}

const inputBase =
  'w-full px-4 py-3 bg-[var(--surface-2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--text-subtle)] focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-muted)] transition'

function TextShort({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <input
        type="text"
        value={value}
        maxLength={question.maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={inputBase}
        placeholder=""
      />
      <CharCount value={value} max={question.maxLength} />
    </div>
  )
}

function TextLong({ question, value, onChange }: { question: Question; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <textarea
        value={value}
        rows={4}
        maxLength={question.maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputBase} resize-y min-h-[110px] leading-relaxed`}
      />
      <CharCount value={value} max={question.maxLength} />
    </div>
  )
}

function CharCount({ value, max }: { value: string; max?: number }) {
  if (!max) return null
  const remaining = max - value.length
  const tone = remaining < 30 ? 'text-[var(--accent)]' : 'text-[var(--text-subtle)]'
  return <div className={`text-[11px] tracking-wide text-right ${tone}`}>{remaining} characters left</div>
}

function SelectOne({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="space-y-2">
      {question.options?.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            type="button"
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`w-full text-left px-4 py-3 rounded-lg border transition flex items-center justify-between ${
              selected
                ? 'border-[var(--accent)] bg-[var(--accent-subtle)] text-[var(--text)]'
                : 'border-[var(--border)] hover:border-[var(--border-hover)] text-[var(--text-muted)] hover:text-[var(--text)]'
            }`}
          >
            <span className="text-sm">{opt.label}</span>
            <span
              className={`w-3.5 h-3.5 rounded-full border ${
                selected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border-hover)]'
              }`}
              aria-hidden
            />
          </button>
        )
      })}
    </div>
  )
}

function MultiSelectChips({
  question,
  value,
  onToggle,
}: {
  question: Question
  value: string[]
  onToggle: (v: string) => void
}) {
  const max = question.maxSelect
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {question.options?.map((opt) => {
          const selected = value.includes(opt.value)
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`px-3.5 py-2 rounded-full text-sm border transition ${
                selected
                  ? 'bg-[var(--accent-subtle)] text-[var(--text)] border-[var(--accent)]'
                  : 'bg-transparent text-[var(--text-muted)] border-[var(--border)] hover:border-[var(--border-hover)] hover:text-[var(--text)]'
              }`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
      {max && (
        <div className="text-[11px] text-[var(--text-subtle)] mt-2">
          {value.length} / {max} selected
        </div>
      )}
    </div>
  )
}

function MoodTiles({
  question,
  value,
  onToggle,
}: {
  question: Question
  value: string[]
  onToggle: (v: string) => void
}) {
  const max = question.maxSelect ?? 3
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {question.options?.map((opt) => {
          const selected = value.includes(opt.value)
          const Icon: LucideIcon | undefined = MOOD_ICONS[opt.value]
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`text-left p-4 rounded-lg border transition relative overflow-hidden ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:border-[var(--border-hover)]'
              }`}
            >
              {Icon && (
                <Icon
                  className={`w-5 h-5 mb-2.5 ${
                    selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] opacity-70'
                  }`}
                  strokeWidth={1.5}
                  aria-hidden
                />
              )}
              <div className="font-display text-sm text-[var(--text)] mb-1">{opt.label}</div>
              <div className="text-[11px] leading-snug text-[var(--text-muted)]">{opt.description}</div>
              {selected && (
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[var(--accent)]" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
      <div className="text-[11px] text-[var(--text-subtle)] mt-2">
        {value.length} / {max} selected
      </div>
    </div>
  )
}

function ArchetypeTiles({
  question,
  value,
  onToggle,
}: {
  question: Question
  value: string[]
  onToggle: (v: string) => void
}) {
  const max = question.maxSelect ?? 3
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options?.map((opt) => {
          const selected = value.includes(opt.value)
          const Icon: LucideIcon | undefined = ARCHETYPE_ICONS[opt.value]
          return (
            <button
              type="button"
              key={opt.value}
              onClick={() => onToggle(opt.value)}
              className={`text-left p-4 rounded-lg border transition relative ${
                selected
                  ? 'border-[var(--accent)] bg-[var(--accent-subtle)]'
                  : 'border-[var(--border)] bg-[var(--surface-2)]/40 hover:border-[var(--border-hover)]'
              }`}
            >
              <div className="flex items-start gap-3">
                {Icon && (
                  <Icon
                    className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      selected ? 'text-[var(--accent)]' : 'text-[var(--text-muted)] opacity-70'
                    }`}
                    strokeWidth={1.5}
                    aria-hidden
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-display text-base text-[var(--text)]">{opt.label}</div>
                    {opt.example && (
                      <div className="text-[11px] text-[var(--text-subtle)] tracking-wide italic flex-shrink-0">
                        e.g. {opt.example}
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs leading-snug text-[var(--text-muted)]">{opt.description}</div>
                </div>
              </div>
              {selected && (
                <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-[var(--accent)]" aria-hidden />
              )}
            </button>
          )
        })}
      </div>
      <div className="text-[11px] text-[var(--text-subtle)] mt-2">
        {value.length} / {max} selected — pick by gut
      </div>
    </div>
  )
}

function PairedInputs({
  question,
  value,
  onChange,
}: {
  question: Question
  value: Array<{ brand: string; word: string }>
  onChange: (v: Array<{ brand: string; word: string }>) => void
}) {
  const count = question.pairCount ?? 5
  const pairs = Array.from({ length: count }, (_, i) => value[i] ?? { brand: '', word: '' })
  function update(i: number, key: 'brand' | 'word', v: string) {
    const next = pairs.map((p, idx) => (idx === i ? { ...p, [key]: v } : p))
    onChange(next)
  }
  return (
    <div className="space-y-2">
      {pairs.map((pair, i) => (
        <div key={i} className="grid grid-cols-[1fr_140px] gap-2">
          <input
            type="text"
            placeholder={`Brand ${i + 1}`}
            value={pair.brand}
            maxLength={80}
            onChange={(e) => update(i, 'brand', e.target.value)}
            className={inputBase}
          />
          <input
            type="text"
            placeholder="One word"
            value={pair.word}
            maxLength={40}
            onChange={(e) => update(i, 'word', e.target.value)}
            className={inputBase}
          />
        </div>
      ))}
    </div>
  )
}

function WordList({
  question,
  value,
  onChange,
}: {
  question: Question
  value: string[]
  onChange: (v: string[]) => void
}) {
  const count = question.wordCount ?? 3
  const words = Array.from({ length: count }, (_, i) => value[i] ?? '')
  function update(i: number, v: string) {
    const next = words.map((w, idx) => (idx === i ? v : w))
    onChange(next)
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {words.map((w, i) => (
        <input
          key={i}
          type="text"
          placeholder={`Word ${i + 1}`}
          value={w}
          maxLength={40}
          onChange={(e) => update(i, e.target.value)}
          className={inputBase}
        />
      ))}
    </div>
  )
}
