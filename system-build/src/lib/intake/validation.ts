// Server-side validation/normalization for intake responses.
// Trusts the question-set as the schema of truth.

import { QUESTIONS_BY_ID, SECTIONS, type Question } from './question-set'

export type ResponseValue = string | string[] | Array<{ brand: string; word: string }>
export type Responses = Record<string, ResponseValue>

export function normalizeResponse(q: Question, raw: unknown): ResponseValue | null {
  if (raw === undefined || raw === null) return null

  switch (q.type) {
    case 'text-short':
    case 'text-long': {
      if (typeof raw !== 'string') return null
      const trimmed = raw.trim()
      if (!trimmed) return null
      const max = q.maxLength ?? 5000
      return trimmed.slice(0, max)
    }
    case 'select-one': {
      if (typeof raw !== 'string') return null
      const allowed = (q.options ?? []).map((o) => o.value)
      return allowed.includes(raw) ? raw : null
    }
    case 'multi-select-chips':
    case 'multi-select-tiles':
    case 'archetype-tiles': {
      if (!Array.isArray(raw)) return null
      const allowed = new Set((q.options ?? []).map((o) => o.value))
      const cleaned = Array.from(new Set(raw.filter((v): v is string => typeof v === 'string' && allowed.has(v))))
      const min = q.minSelect ?? 0
      const max = q.maxSelect ?? cleaned.length
      const sliced = cleaned.slice(0, max)
      if (sliced.length < min) return sliced // store partial for autosave; final-submit re-checks
      return sliced
    }
    case 'paired-inputs': {
      if (!Array.isArray(raw)) return null
      const cleaned = raw
        .map((p): { brand: string; word: string } | null => {
          if (!p || typeof p !== 'object') return null
          const brand = typeof (p as { brand?: unknown }).brand === 'string' ? ((p as { brand: string }).brand).trim().slice(0, 80) : ''
          const word = typeof (p as { word?: unknown }).word === 'string' ? ((p as { word: string }).word).trim().slice(0, 40) : ''
          if (!brand && !word) return null
          return { brand, word }
        })
        .filter((p): p is { brand: string; word: string } => p !== null)
      return cleaned.slice(0, q.pairCount ?? 5)
    }
    case 'word-list': {
      if (!Array.isArray(raw)) return null
      const cleaned = raw
        .map((v) => (typeof v === 'string' ? v.trim().slice(0, 40) : ''))
        .filter((v) => v.length > 0)
      return cleaned.slice(0, q.wordCount ?? 3)
    }
    default:
      return null
  }
}

export function normalizeResponses(input: unknown): Responses {
  if (!input || typeof input !== 'object') return {}
  const inputObj = input as Record<string, unknown>
  const out: Responses = {}
  for (const [id, raw] of Object.entries(inputObj)) {
    const q = QUESTIONS_BY_ID[id]
    if (!q) continue // ignore unknown ids
    const normalized = normalizeResponse(q, raw)
    if (normalized !== null) out[id] = normalized
  }
  return out
}

function shouldSkip(q: Question, responses: Responses): boolean {
  if (!q.showIf) return false
  const dep = responses[q.showIf.questionId]
  return dep !== q.showIf.equals
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

export interface ValidationIssue {
  questionId: string
  sectionId: number
  reason: string
}

export function validateForSubmit(responses: Responses): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  for (const section of SECTIONS) {
    for (const q of section.questions) {
      if (!q.required) continue
      if (shouldSkip(q, responses)) continue
      if (!isAnswered(q, responses[q.id])) {
        issues.push({ questionId: q.id, sectionId: section.id, reason: 'required' })
      }
    }
  }
  return issues
}
