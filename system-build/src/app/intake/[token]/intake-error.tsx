// Error states for the public intake page.

const REASONS: Record<string, { title: string; body: string }> = {
  invalid: {
    title: 'This link isn\'t valid.',
    body: 'Double-check that you copied the full URL. If it still doesn\'t work, ask Scott to send a new one.',
  },
  expired: {
    title: 'This link has expired.',
    body: 'Intake links are good for 14 days. Reply to the email Scott sent and he\'ll send you a fresh one.',
  },
  consumed: {
    title: 'This link has already been used.',
    body: 'If that wasn\'t you, or you need to add to your answers, reach out and we\'ll sort it.',
  },
  submitted: {
    title: 'Your intake is in.',
    body: 'Thanks — Scott has your answers and will be in touch soon. If you want to revise something, just reply to the email and we\'ll get it updated.',
  },
  'missing-intake': {
    title: 'Something is misconfigured.',
    body: 'Please let Scott know so he can re-issue the link.',
  },
}

export function IntakeError({ reason }: { reason: string }) {
  const r = REASONS[reason] ?? REASONS.invalid
  return (
    <div className="glass glass--card text-center space-y-4">
      <h1 className="font-display text-2xl text-[var(--text)]">{r.title}</h1>
      <p className="text-sm text-[var(--text-muted)] max-w-prose mx-auto">{r.body}</p>
    </div>
  )
}
