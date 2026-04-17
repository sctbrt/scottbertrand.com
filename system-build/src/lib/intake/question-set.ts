// Project Intake Questionnaire — v1
// Single source of truth for sections, questions, answer types, and validation.
// Mirrored on client (form) and server (validation/normalization).

export type AnswerType =
  | 'text-short' // single line, ≤200
  | 'text-long' // multiline
  | 'select-one'
  | 'multi-select-chips'
  | 'multi-select-tiles'
  | 'archetype-tiles' // 12 fixed archetypes, exactly 3
  | 'paired-inputs' // brand/word pairs
  | 'word-list' // N short inputs

export interface QuestionOption {
  value: string
  label: string
  description?: string
  example?: string
}

export interface Question {
  id: string // e.g. "1.1", "5.3"
  prompt: string
  microcopy?: string
  type: AnswerType
  required?: boolean
  maxLength?: number
  minSelect?: number
  maxSelect?: number
  pairCount?: number // for paired-inputs
  wordCount?: number // for word-list
  options?: QuestionOption[]
  showIf?: { questionId: string; equals: string } // conditional
}

export interface Section {
  id: number
  slug: string
  title: string
  blurb: string
  estMinutes: number
  questions: Question[]
}

export const ARCHETYPES: QuestionOption[] = [
  { value: 'caregiver', label: 'The Caregiver', description: 'Nurturing, protective, warm.', example: 'Patagonia' },
  { value: 'sage', label: 'The Sage', description: 'Wise, considered, truth-seeking.', example: 'The New York Times' },
  { value: 'rebel', label: 'The Rebel', description: 'Disruptive, unflinching, breaks rules.', example: 'Harley-Davidson' },
  { value: 'hero', label: 'The Hero', description: 'Courageous, capable, problem-solver.', example: 'Nike' },
  { value: 'creator', label: 'The Creator', description: 'Imaginative, expressive, makes things.', example: 'Lego' },
  { value: 'magician', label: 'The Magician', description: 'Transformative, intuitive, makes the impossible feel real.', example: 'Disney' },
  { value: 'lover', label: 'The Lover', description: 'Sensual, intimate, beautiful.', example: 'Chanel' },
  { value: 'jester', label: 'The Jester', description: 'Playful, witty, doesn\'t take itself too seriously.', example: 'Mailchimp' },
  { value: 'everyman', label: 'The Everyman', description: 'Down-to-earth, honest, for-everyone.', example: 'IKEA' },
  { value: 'explorer', label: 'The Explorer', description: 'Adventurous, free-spirited, restless.', example: 'REI' },
  { value: 'innocent', label: 'The Innocent', description: 'Pure, hopeful, simple.', example: 'Dove' },
  { value: 'ruler', label: 'The Ruler', description: 'Authoritative, refined, in control.', example: 'Rolex' },
]

export const VOICE_CHIPS: QuestionOption[] = [
  { value: 'warm-welcoming', label: 'Warm and welcoming' },
  { value: 'sharp-witty', label: 'Sharp and witty' },
  { value: 'quiet-observant', label: 'Quiet and observant' },
  { value: 'energetic-bold', label: 'Energetic and bold' },
  { value: 'reverent-considered', label: 'Reverent and considered' },
  { value: 'playful-irreverent', label: 'Playful and irreverent' },
  { value: 'confident-direct', label: 'Confident and direct' },
  { value: 'curious-questioning', label: 'Curious and questioning' },
  { value: 'soft-reassuring', label: 'Soft and reassuring' },
  { value: 'plainspoken-honest', label: 'Plainspoken and honest' },
]

export const MOOD_TILES: QuestionOption[] = [
  { value: 'editorial', label: 'Editorial', description: 'High-contrast, magazine-like, considered typography.' },
  { value: 'architectural', label: 'Architectural', description: 'Structured, geometric, glass and stone.' },
  { value: 'hand-crafted', label: 'Hand-crafted', description: 'Imperfect, warm, signs of the maker\'s hand.' },
  { value: 'playful', label: 'Playful', description: 'Bright, expressive, doesn\'t take itself too seriously.' },
  { value: 'earthy', label: 'Earthy', description: 'Muted, organic, natural materials.' },
  { value: 'luxurious', label: 'Luxurious', description: 'Restrained, generous space, premium feel.' },
  { value: 'minimal', label: 'Minimal', description: 'Spare, quiet, only what\'s needed.' },
  { value: 'tech-forward', label: 'Tech-forward', description: 'Sharp, precise, futureward.' },
  { value: 'nostalgic', label: 'Nostalgic', description: 'Warm reference to a specific era.' },
]

export const SECTIONS: Section[] = [
  {
    id: 1,
    slug: 'basics',
    title: 'The Basics',
    blurb: 'Practical stuff so I have it on hand.',
    estMinutes: 2,
    questions: [
      { id: '1.1', prompt: 'Confirm your business name.', type: 'text-short', required: true, maxLength: 120 },
      {
        id: '1.2',
        prompt: 'If a stranger at a coffee shop asked what you do, what would you say in one sentence?',
        microcopy: 'Don\'t worry about being clever. The honest answer is the right one.',
        type: 'text-long',
        required: true,
        maxLength: 200,
      },
      {
        id: '1.3',
        prompt: 'How long have you been doing this?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'just-starting', label: 'Just starting' },
          { value: 'lt-1', label: 'Less than 1 year' },
          { value: '1-3', label: '1–3 years' },
          { value: '3-10', label: '3–10 years' },
          { value: '10-plus', label: '10+ years' },
        ],
      },
      { id: '1.4a', prompt: 'Where are you based?', type: 'text-short', required: true, maxLength: 120 },
      { id: '1.4b', prompt: 'Where do you serve customers?', type: 'text-short', required: true, maxLength: 200 },
    ],
  },
  {
    id: 2,
    slug: 'why',
    title: 'The Why',
    blurb: 'The clearer your "why," the easier everything downstream gets.',
    estMinutes: 3,
    questions: [
      {
        id: '2.1',
        prompt: 'What problem do you solve for the people you serve?',
        microcopy: 'Not "what you sell" — what changes for someone after working with you.',
        type: 'text-long',
        required: true,
        maxLength: 400,
      },
      {
        id: '2.2',
        prompt: 'Why did you start this in the first place? (The real reason — not the LinkedIn version.)',
        type: 'text-long',
        required: true,
        maxLength: 500,
      },
      {
        id: '2.3',
        prompt: 'If your business disappeared tomorrow, what would your customers genuinely miss?',
        type: 'text-long',
        maxLength: 300,
      },
      {
        id: '2.4',
        prompt: 'Beyond making a living, what\'s the bigger reason this exists?',
        type: 'text-long',
        maxLength: 400,
      },
    ],
  },
  {
    id: 3,
    slug: 'who',
    title: 'The Who',
    blurb: 'Strong brands talk to specific people. Vague audiences make vague work.',
    estMinutes: 3,
    questions: [
      {
        id: '3.1',
        prompt: 'Describe your ideal customer in 2–3 sentences. Who are they, what do they care about, what\'s their life like?',
        type: 'text-long',
        required: true,
        maxLength: 500,
      },
      {
        id: '3.2',
        prompt: 'Tell me about a recent customer who was a "perfect fit." What were they trying to do? What made the work feel right?',
        type: 'text-long',
        required: true,
        maxLength: 600,
      },
      {
        id: '3.3',
        prompt: 'Who is not your customer? Who would you politely turn away?',
        microcopy: 'Knowing who you\'re not for is sometimes more useful than knowing who you are for.',
        type: 'text-long',
        required: true,
        maxLength: 300,
      },
      {
        id: '3.4',
        prompt: 'Before someone finds you, what are they usually struggling with? What have they tried that didn\'t work?',
        type: 'text-long',
        required: true,
        maxLength: 400,
      },
    ],
  },
  {
    id: 4,
    slug: 'what',
    title: 'The What',
    blurb: 'Quick inventory of what\'s actually on the table.',
    estMinutes: 2,
    questions: [
      { id: '4.1', prompt: 'What do you sell or deliver?', type: 'text-long', required: true, maxLength: 500 },
      { id: '4.2', prompt: 'What\'s the offering people gravitate to most?', type: 'text-short', required: true, maxLength: 200 },
      {
        id: '4.3',
        prompt: 'What\'s something you wish more people understood about what you do?',
        type: 'text-long',
        maxLength: 400,
      },
    ],
  },
  {
    id: 5,
    slug: 'voice',
    title: 'The Voice',
    blurb: 'Shapes every word on the site.',
    estMinutes: 3,
    questions: [
      {
        id: '5.1',
        prompt: 'Pick the three archetypes that feel most like your brand.',
        microcopy: 'Brand archetypes are reliable patterns for personality. Pick by gut — descriptions are guides, not rules.',
        type: 'archetype-tiles',
        required: true,
        minSelect: 3,
        maxSelect: 3,
        options: ARCHETYPES,
      },
      {
        id: '5.2',
        prompt: 'If your brand were a person at a dinner party, how would they talk?',
        microcopy: 'Pick all that fit.',
        type: 'multi-select-chips',
        required: true,
        minSelect: 1,
        maxSelect: 6,
        options: VOICE_CHIPS,
      },
      {
        id: '5.3',
        prompt: 'Name 5 brands you admire — any industry. For each, give one word for why.',
        type: 'paired-inputs',
        required: true,
        pairCount: 5,
      },
      { id: '5.4', prompt: '3 words you\'d never want anyone to use about your brand.', type: 'word-list', required: true, wordCount: 3 },
    ],
  },
  {
    id: 6,
    slug: 'look',
    title: 'The Look',
    blurb: 'Sets the visual starting line. Pick by feel.',
    estMinutes: 3,
    questions: [
      {
        id: '6.1',
        prompt: 'Which visual moods feel like you?',
        microcopy: 'Pick up to 3.',
        type: 'multi-select-tiles',
        required: true,
        minSelect: 1,
        maxSelect: 3,
        options: MOOD_TILES,
      },
      {
        id: '6.2a',
        prompt: 'Reference 1: a website, brand, magazine, or photo you love. Paste a link or describe.',
        microcopy: 'I\'m not going to copy these — I want to understand what catches your eye.',
        type: 'text-long',
        required: true,
        maxLength: 400,
      },
      { id: '6.2b', prompt: 'Reference 2 you love.', type: 'text-long', required: true, maxLength: 400 },
      { id: '6.2c', prompt: 'Reference 3 you love.', type: 'text-long', required: true, maxLength: 400 },
      {
        id: '6.3a',
        prompt: 'Show me one you actively dislike, and a sentence on why.',
        type: 'text-long',
        required: true,
        maxLength: 400,
      },
      { id: '6.3b', prompt: 'A second one you dislike (optional).', type: 'text-long', maxLength: 400 },
      { id: '6.4a', prompt: 'Colors that feel absolutely "you"?', type: 'text-long', maxLength: 200 },
      { id: '6.4b', prompt: 'Colors that feel absolutely "not you"?', type: 'text-long', maxLength: 200 },
      {
        id: '6.5',
        prompt: 'Your existing brand — what should we do with it?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'keep', label: 'Keep as-is, build around it' },
          { value: 'refresh', label: 'Refresh — keep the bones, modernize' },
          { value: 'rebuild', label: 'Rebuild from scratch' },
          { value: 'none', label: 'I don\'t have one yet' },
        ],
      },
    ],
  },
  {
    id: 7,
    slug: 'site',
    title: 'The Site',
    blurb: 'What the site actually needs to do.',
    estMinutes: 3,
    questions: [
      {
        id: '7.1',
        prompt: 'When someone leaves your site, what\'s the one thing they should be able to do?',
        microcopy: 'Book? Buy? Email? Call? Just remember you?',
        type: 'text-short',
        required: true,
        maxLength: 200,
      },
      {
        id: '7.2',
        prompt: 'What other actions matter?',
        type: 'multi-select-chips',
        required: true,
        minSelect: 1,
        options: [
          { value: 'book', label: 'Book a call / appointment' },
          { value: 'buy', label: 'Buy a product' },
          { value: 'subscribe', label: 'Subscribe to a newsletter' },
          { value: 'download', label: 'Download something (PDF, guide)' },
          { value: 'read', label: 'Read a story (blog, articles)' },
          { value: 'portfolio', label: 'See a portfolio' },
          { value: 'apply', label: 'Apply / fill out a form' },
          { value: 'email', label: 'Send an email' },
          { value: 'call', label: 'Call a phone number' },
          { value: 'find', label: 'Find a physical location' },
        ],
      },
      {
        id: '7.3',
        prompt: 'What pages do you imagine you\'ll need?',
        type: 'multi-select-chips',
        required: true,
        minSelect: 1,
        options: [
          { value: 'home', label: 'Home' },
          { value: 'about', label: 'About' },
          { value: 'services', label: 'Services / What I do' },
          { value: 'portfolio', label: 'Portfolio / Work' },
          { value: 'contact', label: 'Contact' },
          { value: 'notes', label: 'Notes / Blog' },
          { value: 'faq', label: 'FAQ' },
          { value: 'pricing', label: 'Pricing' },
        ],
      },
      {
        id: '7.4',
        prompt: 'Where will the words on the site come from?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'me', label: 'I\'ll write it all' },
          { value: 'me-polish', label: 'I have most of it, you polish' },
          { value: 'co-write', label: 'Let\'s write it together' },
          { value: 'interview', label: 'You write it from interviews with me' },
          { value: 'unsure', label: 'Not sure yet' },
        ],
      },
      {
        id: '7.5',
        prompt: 'What about photos and visuals?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'have-all', label: 'I have what we need' },
          { value: 'have-some', label: 'I have some, we need more' },
          { value: 'shoot', label: 'We need to do a shoot' },
          { value: 'stock', label: 'Stock or illustration is fine' },
          { value: 'unsure', label: 'Not sure yet' },
        ],
      },
      {
        id: '7.6',
        prompt: 'Anything that needs to plug in?',
        microcopy: 'Pick all that apply.',
        type: 'multi-select-chips',
        options: [
          { value: 'booking', label: 'Online booking (Calendly, etc.)' },
          { value: 'payments', label: 'Payments / e-commerce' },
          { value: 'newsletter', label: 'Newsletter (Mailchimp, etc.)' },
          { value: 'blog', label: 'Blog' },
          { value: 'crm', label: 'CRM' },
          { value: 'form-notify', label: 'Form notifications to email' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'social', label: 'Social feed embeds' },
          { value: 'none', label: 'None of these' },
        ],
      },
      {
        id: '7.7',
        prompt: 'Domain — do you have one?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'have-love', label: 'Yes, and I love it' },
          { value: 'have-change', label: 'Yes, but I might change it' },
          { value: 'idea', label: 'I have an idea but don\'t own it' },
          { value: 'help', label: 'I need help choosing one' },
          { value: 'unsure', label: 'Not sure' },
        ],
      },
    ],
  },
  {
    id: 8,
    slug: 'logistics',
    title: 'The Logistics',
    blurb: 'Last stretch. The boring-but-important stuff.',
    estMinutes: 2,
    questions: [
      {
        id: '8.1',
        prompt: 'What feels like a realistic timeline?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'asap', label: 'ASAP — within 4 weeks' },
          { value: '1-2-months', label: 'Next 1–2 months' },
          { value: 'quarter', label: 'Next quarter' },
          { value: 'no-deadline', label: 'No specific deadline' },
        ],
      },
      {
        id: '8.2',
        prompt: 'Who\'s involved in decisions?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'just-me', label: 'Just me' },
          { value: 'partner', label: 'Me + a partner' },
          { value: 'small-group', label: 'Me + a small group' },
          { value: 'committee', label: 'I\'ll need to run things by someone' },
        ],
      },
      {
        id: '8.3',
        prompt: 'Have you worked with a designer or web person before?',
        type: 'select-one',
        required: true,
        options: [
          { value: 'yes-good', label: 'Yes — and it went well' },
          { value: 'yes-bad', label: 'Yes — and it didn\'t' },
          { value: 'no', label: 'No, this is my first time' },
        ],
      },
      {
        id: '8.4',
        prompt: 'What worked, and what didn\'t?',
        type: 'text-long',
        maxLength: 500,
        showIf: { questionId: '8.3', equals: 'yes-good' },
      },
      {
        id: '8.5',
        prompt: 'Finish this sentence: "This project is a success if…"',
        type: 'text-long',
        required: true,
        maxLength: 400,
      },
      {
        id: '8.6',
        prompt: 'Anything else I should know — about you, your business, your customers, your hopes for this — that I haven\'t asked?',
        type: 'text-long',
        maxLength: 800,
      },
    ],
  },
]

// Lookup map for validation
export const QUESTIONS_BY_ID: Record<string, Question> = SECTIONS.reduce(
  (acc, s) => {
    for (const q of s.questions) acc[q.id] = q
    return acc
  },
  {} as Record<string, Question>,
)

export const TOTAL_QUESTIONS = Object.keys(QUESTIONS_BY_ID).length
export const TOTAL_SECTIONS = SECTIONS.length
export const ESTIMATED_MINUTES = SECTIONS.reduce((sum, s) => sum + s.estMinutes, 0)
