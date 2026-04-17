// Lucide icon mapping for archetype + mood tile values.
// Kept separate from question-set.ts so the question data stays serializable
// (icons are React components — they can't be in JSON-serializable data).

import type { LucideIcon } from 'lucide-react'
import {
  Heart,
  BookOpen,
  Flame,
  Mountain,
  Palette,
  Sparkles,
  HeartHandshake,
  Music,
  Users,
  Compass,
  Sun,
  Crown,
  Newspaper,
  Frame,
  Hand,
  PartyPopper,
  Leaf,
  Diamond,
  Minus,
  Cpu,
  Camera,
} from 'lucide-react'

export const ARCHETYPE_ICONS: Record<string, LucideIcon> = {
  caregiver: Heart,
  sage: BookOpen,
  rebel: Flame,
  hero: Mountain,
  creator: Palette,
  magician: Sparkles,
  lover: HeartHandshake,
  jester: Music,
  everyman: Users,
  explorer: Compass,
  innocent: Sun,
  ruler: Crown,
}

export const MOOD_ICONS: Record<string, LucideIcon> = {
  editorial: Newspaper,
  architectural: Frame,
  'hand-crafted': Hand,
  playful: PartyPopper,
  earthy: Leaf,
  luxurious: Diamond,
  minimal: Minus,
  'tech-forward': Cpu,
  nostalgic: Camera,
}
