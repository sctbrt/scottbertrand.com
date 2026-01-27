# Claude Instructions — Scott Bertrand Ecosystem

## Version 4.0.1 (Current)

This document is the single source of truth for the **Scott Bertrand digital ecosystem**. It supersedes all previous versions (including v1.5.1).

---

## 1. Ecosystem Overview

The Scott Bertrand ecosystem consists of seven interconnected properties:

| Property | Domain | Purpose | Stack |
|----------|--------|---------|-------|
| **scottbertrand.com** | scottbertrand.com | Personal hub & portfolio | Vite + Vanilla JS |
| **Bertrand Brands** | bertrandbrands.com | Design studio & services | Vite + Vanilla JS |
| **Notes** | notes.scottbertrand.com | Blog/writing | Vite + Vanilla JS |
| **Goods** | goods.scottbertrand.com | Digital storefront | Vite + Vanilla JS |
| **Test (SB)** | test.scottbertrand.com | Live testing for scottbertrand.com | Vite + Vanilla JS |
| **Test (BB)** | test.bertrandbrands.com | Live testing for bertrandbrands.com | Vite + Vanilla JS |
| **Internal System** | dashboard.bertrandbrands.com | Backend admin & client portal | Next.js 16 + Prisma |

### Repository Locations

```
/Users/scottbertrand/Sites/
├── scottbertrand.com/           # Main hub site
│   ├── src/                     # Vite source
│   ├── system-build/            # Next.js internal system
│   └── CLAUDE.md                # This file
├── bertrandbrands.com/          # Design studio
│   └── src/                     # Static HTML (Vercel)
├── notes.scottbertrand.com/     # Blog
├── goods.scottbertrand.com/     # Storefront
└── (test sites mirror production structure)
```

---

## 2. V4.0.0 Design Philosophy

### 2.1 Core Aesthetic Principles

V4.0.0 represents a **refined, minimal, architectural** approach:

- **Restraint over spectacle** — Effects should be barely perceptible
- **Content-first** — Design serves content, never competes with it
- **Material realism** — Glass and lighting should feel physical, not digital
- **Time-aware theming** — Sites respond to time of day (Canada/Eastern)
- **Motion hierarchy** — scottbertrand.com is restrained; bertrandbrands.com allows more expression

### 2.2 Visual Language

The V4.0.0 aesthetic is characterized by:

- Architectural glass materials with edge-lit lighting
- Dark-first design with subtle amber/warm accents
- Fraunces (display) + Inter (body) typography pairing
- Restrained motion with heavy easing
- RGB ethereal effects (bertrandbrands.com only)

---

## 3. Design Tokens

### 3.1 Colors

```css
/* Dark Theme (Default) */
--bg: #0a0a0a;
--bg-elevated: #111111;
--text: #fafafa;
--text-muted: #888888;
--text-subtle: #555555;
--accent: #D97706;           /* Amber 600 */
--accent-hover: #B45309;     /* Amber 700 */
--border: rgba(255, 255, 255, 0.08);

/* Light Theme */
--bg: #fafaf8;
--bg-elevated: #ffffff;
--text: #111111;
--text-muted: #666666;
--accent: #B45309;           /* Amber 700 */

/* Glass Properties */
--glass-blur: 12px;
--glass-bg: rgba(255, 255, 255, 0.02);
--glass-border: rgba(255, 255, 255, 0.06);
--glass-edge-highlight: rgba(255, 255, 255, 0.08);
```

### 3.2 Typography

```css
/* Font Families */
--font-display: 'Fraunces', Georgia, serif;
--font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

/* Type Scale */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */

/* Line Heights */
--leading-tight: 1.25;
--leading-snug: 1.375;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 3.3 Spacing

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-24: 6rem;     /* 96px */
```

### 3.4 Motion

```css
/* Durations */
--duration-fast: 150ms;
--duration-normal: 300ms;
--duration-slow: 500ms;
--duration-slower: 700ms;

/* Easings */
--ease-out: cubic-bezier(0.33, 1, 0.68, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);

/* V4 Animation Philosophy */
/* scottbertrand.com: Restrained, barely perceptible */
/* bertrandbrands.com: Expressive but purposeful */
```

---

## 4. Glass Material System

### 4.1 Implementation

Glass is implemented via `css/glass.css` on each property:

```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

/* Edge highlighting */
.glass::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 1px 0 var(--glass-edge-highlight);
  pointer-events: none;
}
```

### 4.2 Glass Rules

- Glass is **architectural**, not decorative
- Apply glass only for hierarchy and containment
- Never stack glass-on-glass
- Provide fallback for browsers without `backdrop-filter`
- Edge-lit, not surface-lit

### 4.3 Ambient Light Response (Desktop Only)

On scottbertrand.com, cursor position **very subtly** influences glass edge lighting:

- Effect must be barely perceptible
- Heavy damping/inertia (no follow-the-mouse behavior)
- Respects `prefers-reduced-motion`
- Implemented in `js/glass-light.js`

---

## 5. Time-Based Theme System

### 5.1 Overview

Sites respond to time of day based on **Canada/Eastern timezone**:

| Period | Hours | Theme |
|--------|-------|-------|
| Dawn | 5:00 - 7:59 | Transitional warm |
| Morning | 8:00 - 11:59 | Light |
| Afternoon | 12:00 - 16:59 | Light |
| Evening | 17:00 - 19:59 | Transitional cool |
| Night | 20:00 - 4:59 | Dark |

### 5.2 Implementation

Theme is set via `data-theme` attribute on `<html>`:

```js
// js/theme.js
function getThemeFromTime() {
  const hour = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: false
  });
  // Returns 'light' or 'dark' based on hour
}
```

### 5.3 User Override

Users can toggle theme manually. Preference is stored in `localStorage`:

```js
localStorage.getItem('theme-preference') // 'light', 'dark', or null (auto)
```

---

## 6. Property-Specific Guidelines

### 6.1 scottbertrand.com (Hub)

**Intent**: Personal presence, portfolio showcase, central navigation point.

**Aesthetic**:
- Most restrained of all properties
- Glass effects at minimum intensity
- Near-zero decorative motion
- Content-forward layout

**Key Files**:
```
src/
├── index.html
├── css/
│   ├── style.css
│   ├── glass.css
│   └── theme.css
└── js/
    ├── main.js
    ├── theme.js
    └── glass-light.js
```

### 6.2 bertrandbrands.com (Design Studio)

**Intent**: Professional services showcase, lead generation, brand expression.

**Aesthetic**:
- More expressive than scottbertrand.com
- RGB ethereal effects permitted (subtly)
- Animated gradients on key CTAs
- Mobile hamburger menu with transitions

**Unique Features**:
- RGB border animations on secondary CTAs
- Ethereal text glow on hover states
- Three RGB spotlights (mobile hero only)
- Formspree integration for contact form

**Key Files**:
```
src/
├── index.html
├── thanks.html          # Form submission confirmation
├── css/
│   └── style.css
└── assets/
    ├── bertrand-brands-logomark.png
    └── bertrand-brands-wordmark.png
```

**Vercel Configuration** (`vercel.json`):
- Redirects: /about, /services, /process, /contact → hash anchors
- Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

### 6.3 notes.scottbertrand.com (Blog)

**Intent**: Long-form writing, thoughts, technical posts.

**Aesthetic**:
- Reading-optimized typography
- Minimal chrome, maximum content
- Dark theme default for long reading sessions

### 6.4 goods.scottbertrand.com (Storefront)

**Intent**: Digital products, templates, resources.

**Aesthetic**:
- Product-focused layout
- Clear pricing and CTAs
- Checkout integration (future)

### 6.5 Test Sites

- **test.scottbertrand.com**: Mirrors scottbertrand.com for pre-production testing
- **test.bertrandbrands.com**: Mirrors bertrandbrands.com for pre-production testing

---

## 7. Internal System (Bertrand Brands Backend)

### 7.1 Overview

The internal system powers admin dashboard and client portal functionality.

**Location**: `/Users/scottbertrand/Sites/scottbertrand.com/system-build/`

**Stack**:
- Next.js 16 (App Router)
- TypeScript
- Prisma ORM
- Vercel Postgres
- Auth.js (magic link via Resend)
- Upstash Redis (rate limiting)

### 7.2 Domain Routing

```
dashboard.bertrandbrands.com → /dashboard/* (admin)
clients.bertrandbrands.com   → /portal/* (client portal)
```

Middleware handles host-based routing (`src/middleware.ts`).

### 7.3 Authentication

Magic link authentication via Auth.js + Resend:

- Sends from: `Bertrand Brands <hello@bertrandbrands.com>`
- Session strategy: Database (30-day expiry)
- Roles: ADMIN, CLIENT

**Auth Flow**:
1. User enters email at `/login`
2. Magic link sent via Resend
3. User clicks link, session created
4. Middleware checks session cookie for protected routes

### 7.4 Database Schema (Key Models)

```prisma
model users {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  role          Role      @default(CLIENT)
  emailVerified DateTime?
  // ... relations
}

model leads {
  id          String   @id @default(cuid())
  email       String
  name        String?
  companyName String?
  service     String?  // References service_templates.slug
  message     String?
  source      String   @default("website")
  status      String   @default("NEW")
  isSpam      Boolean  @default(false)
  formData    Json?
  // ... timestamps
}

model service_templates {
  slug        String  @id
  name        String
  description String?
  // ... fields
}
```

### 7.5 API Endpoints

**Public (No Auth Required)**:
- `POST /api/intake/formspree` — Webhook for form submissions
- `POST /api/webhooks/*` — External service webhooks

**Protected (Auth Required)**:
- All `/dashboard/*` routes
- All `/portal/*` routes

### 7.6 Form Submission Flow

1. User submits form on bertrandbrands.com
2. Formspree receives submission, triggers webhook
3. Webhook hits `/api/intake/formspree`
4. Rate limiting checked (Upstash Redis)
5. Spam detection applied
6. Lead created in database
7. Pushover notification sent (if configured)
8. User redirected to `/thanks.html`

---

## 8. Email Configuration

### 8.1 Transactional Email (Resend)

- **Provider**: Resend
- **From Address**: `hello@bertrandbrands.com`
- **Use Cases**: Magic link auth, notifications

### 8.2 Email Routing (Cloudflare)

- **Provider**: Cloudflare Email Routing (free)
- **Route**: `hello@bertrandbrands.com` → `bertrandbrands@outlook.com`
- **DNS**: Managed via Cloudflare (nameservers: jaime.ns.cloudflare.com, lila.ns.cloudflare.com)

---

## 9. Deployment

### 9.1 Static Sites (Vite)

| Site | Platform | Build |
|------|----------|-------|
| scottbertrand.com | Vercel | `npm run build` |
| bertrandbrands.com | Vercel | Static (no build) |
| notes.scottbertrand.com | Vercel | `npm run build` |
| goods.scottbertrand.com | Vercel | `npm run build` |

### 9.2 Internal System (Next.js)

- **Platform**: Vercel
- **Database**: Vercel Postgres
- **Cache**: Upstash Redis
- **Build**: `npm run build`

---

## 10. Absolute Constraints

These rules override all other instincts:

### Design
- If an effect is noticeable, it is wrong
- Glass is architectural, not decorative
- Zero gimmicks, zero spectacle
- Content always takes priority over chrome

### Code
- Do NOT add dependencies or frameworks to static sites
- Do NOT restructure existing layouts
- Keep diffs minimal
- Preserve existing formatting

### Motion
- scottbertrand.com: Near-zero decorative motion
- bertrandbrands.com: Restrained but expressive
- All sites: Respect `prefers-reduced-motion`

### Accessibility
- Maintain WCAG contrast ratios
- Provide fallbacks for `backdrop-filter`
- Do not break keyboard navigation

---

## 11. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.5.1 | — | Glass material system, typography refinement |
| 4.0.0 | Jan 2026 | Ecosystem unification, time-based theming, RGB effects (BB) |
| 4.0.1 | Jan 2026 | Accessibility fixes, SEO improvements, mobile menu, email routing |

---

## 12. Quick Reference

### Common Tasks

**Run local development (static sites)**:
```bash
cd /Users/scottbertrand/Sites/scottbertrand.com
npm run dev
```

**Run internal system locally**:
```bash
cd /Users/scottbertrand/Sites/scottbertrand.com/system-build
npm run dev
```

**Check database**:
```bash
cd system-build
npx prisma studio
```

### Environment Variables (Internal System)

```env
# Database
DATABASE_URL=

# Auth
AUTH_SECRET=
AUTH_RESEND_KEY=
RESEND_API_KEY=

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Notifications
PUSHOVER_USER_KEY=
PUSHOVER_API_TOKEN=
```

---

**End of Instructions**
