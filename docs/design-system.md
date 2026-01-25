# Design System — scottbertrand.com

**Version:** 2.0.0
**Updated:** January 2026

A disciplined design system for architectural, premium web design. This document captures the tokens, rules, and constraints that govern the visual language.

---

## Design Philosophy

- **Material, not effect** — Glass looks like glass, not glow
- **Grid discipline** — Everything aligns to the same container and spacing scale
- **Accent as punctuation** — Warm Amber appears sparingly, not as blanket fill
- **Typography reads calm** — Editorial hierarchy, not marketing noise
- **Accessibility first** — Focus states, contrast, reduced motion all supported

---

## 1. Color Tokens

### Light Mode (Default)

```css
--bg: #F7F6F3;           /* Primary background */
--surface: #FFFFFF;       /* Elevated surfaces */
--surface-2: #EFEFEA;     /* Section alternates */
--text: #111111;          /* Primary text */
--text-muted: #5c5c5c;    /* Secondary text */
--border: rgba(0,0,0,0.08);
```

### Dark Mode

```css
--bg: #1C1C1E;
--surface: #2C2C2E;
--surface-2: #232325;
--text: #F7F6F3;
--text-muted: #a0a0a0;
--border: rgba(255,255,255,0.08);
```

### Accent Colors

| Token | Light Mode | Dark Mode | Usage |
|-------|-----------|-----------|-------|
| `--accent` | #D97706 (Warm Amber) | #F59E0B | Section headers, step numbers |
| `--accent-hover` | #B45309 (Deep Terracotta) | #D97706 | Hover states |
| `--accent-muted` | rgba(217,119,6,0.12) | rgba(245,158,11,0.15) | Subtle backgrounds |
| `--accent-subtle` | rgba(217,119,6,0.06) | rgba(245,158,11,0.08) | Very subtle fills |

### Focus Ring

```css
--focus-ring: rgba(217,119,6,0.5);   /* Light mode */
--focus-ring: rgba(245,158,11,0.5);  /* Dark mode */
--focus-ring-offset: 2px;
```

---

## 2. Spacing Scale

All spacing uses a consistent scale. Avoid arbitrary values.

```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
--space-24: 96px;
```

### Section Padding

- Default section: `64px` top/bottom
- Small section: `48px` top/bottom
- Large section: `96px` top/bottom

---

## 3. Layout System

### Container Widths

```css
--container-max: 1120px;      /* Default content width */
--container-narrow: 680px;    /* Text-heavy pages */
--container-wide: 1200px;     /* Full-width sections */
--gutter: 24px;               /* Side padding (20px on mobile) */
```

### Grid

12-column grid with `24px` gap (16px on mobile).

```css
.grid { display: grid; gap: var(--grid-gap); }
.grid--cols-2 { grid-template-columns: repeat(2, 1fr); }
.grid--cols-3 { grid-template-columns: repeat(3, 1fr); }
.grid--cols-4 { grid-template-columns: repeat(4, 1fr); }
```

Responsive: 4-col → 2-col at 900px, 2-col → 1-col at 640px.

---

## 4. Typography

### Font Families

```css
--font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-serif: 'Source Serif 4', Georgia, serif;
```

### Type Scale (Fluid)

| Level | Size (clamp) | Usage |
|-------|-------------|-------|
| `--text-3xl` | 28–40px | H1 (Hero) |
| `--text-2xl` | 24–32px | H1 (Page) |
| `--text-xl` | 20–24px | H2 (Section) |
| `--text-lg` | 17–18px | H3 (Card) |
| `--text-base` | 15–16px | Body |
| `--text-sm` | 13–14px | Small, captions |
| `--text-xs` | 11–12px | Labels |

### Line Height

```css
--leading-tight: 1.2;     /* Headings */
--leading-snug: 1.35;     /* Subheads */
--leading-normal: 1.5;    /* UI text */
--leading-relaxed: 1.65;  /* Body (serif) */
--leading-loose: 1.75;    /* Prose */
```

### Max Line Length

Body copy: `max-width: 65ch`

---

## 5. Border Radius

```css
--radius-sm: 4px;    /* Inputs, small elements */
--radius-md: 8px;    /* Cards, buttons */
--radius-lg: 12px;   /* Glass panels */
--radius-xl: 16px;   /* Hero glass */
```

---

## 6. Shadows (Restrained)

Only two shadow levels. No heavy drop shadows.

```css
--shadow-sm:
  0 1px 2px rgba(0,0,0,0.04),
  0 2px 4px rgba(0,0,0,0.04);

--shadow-md:
  0 2px 4px rgba(0,0,0,0.04),
  0 4px 12px rgba(0,0,0,0.06);
```

---

## 7. Glass System

### Single Recipe

All glass panels use the same material:

```css
background: rgba(255,255,255,0.04);    /* Very translucent */
border: 1px solid rgba(0,0,0,0.06);    /* Outer edge */
backdrop-filter: blur(12px) saturate(130%);
```

Inner pseudo-element adds:
- Inner stroke for plane definition
- Specular highlight (top edge only)
- Micro-grain texture at 2.5% opacity

### Variants (Padding Only)

| Class | Padding | Use Case |
|-------|---------|----------|
| `.glass--panel` | 24px / 20px | Content cards |
| `.glass--hero` | 40px / 32px | Hero containers |
| `.glass--callout` | 16px / 20px | Inline callouts |
| `.glass--band` | 20px / 24px | Section dividers |
| `.glass--footer` | 32px | Footer container |

### Prohibited

- Orange/accent glow on glass panels
- Large soft shadows ("web2" aesthetic)
- Inconsistent blur values
- Multiple border treatments
- Heavy specular effects
- Glass-on-glass stacking

---

## 8. Accent Application Rules

### DO Apply Accent To:

- **Section headers (H2)** — `color: var(--accent)`
- **Step number rings** — `border-color: var(--accent)`
- **Step number text** — `color: var(--accent)`
- **Link hover underlines** — `text-decoration-color: var(--accent)`
- **Secondary button hover** — `border-color: var(--accent); color: var(--accent)`
- **Focus rings** — `outline: 2px solid var(--focus-ring)`
- **Thin accent rules** — 2px marker bars below section titles

### DO NOT Apply Accent As:

- Primary button fill (use neutral dark/light)
- Large background fills
- Persistent glow effects
- Glass panel borders or shadows
- Default link color

---

## 9. Button System

### Primary Button

Neutral fill, not accent:

```css
background: var(--text);
color: var(--bg);
border-color: var(--text);
```

### Secondary Button

Accent on hover:

```css
background: transparent;
color: var(--text);
border-color: var(--border);

&:hover {
  border-color: var(--accent);
  color: var(--accent);
}
```

### Focus State

```css
outline: 2px solid var(--focus-ring);
outline-offset: 2px;
```

---

## 10. Accessibility

### Focus States

All interactive elements get visible focus rings using `--focus-ring`.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Contrast

- Accent on light background: passes WCAG AA for large text
- Accent on dark background: passes WCAG AA for large text
- Body text contrast ratios verified in both modes

---

## 11. File Structure

```
src/styles/
├── tokens.css      # Design tokens (import first)
├── styles.css      # Base styles + components
├── glass.css       # Glass material system
└── accent.css      # (Deprecated - moved to styles.css)
```

---

## 12. Implementation Checklist

When adding new components:

- [ ] Uses token variables, not hardcoded values
- [ ] Aligns to container width and gutter
- [ ] Uses spacing scale values
- [ ] Has visible focus state
- [ ] Works in both light/dark modes
- [ ] Respects reduced-motion preference
- [ ] Accent used sparingly (headers, not fills)
- [ ] Glass panels use single recipe

---

*Last updated: January 2026 — Architect Feedback Integration*
