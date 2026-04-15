# Claude Instructions — Scott Bertrand Ecosystem

## Version 4.0.5 (Current)

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

**Service Architecture** (v4.2.0):

Bertrand Brands operates two distinct service categories with sub-brand visual identities:

**B Core Services** — Strategic, discovery-led engagements
- Direction Sessions, Audits, Brand Resets, Website Foundations
- Solid borders, appears first in services section
- Visual mark: B logomark (40px) + "Core Services" wordmark (Fraunces)

**B Focus Studio** — Fixed-scope, fixed-price offerings
- Website Fix Sprint ($750), One-Page Website Rebuild ($1,250), Brandmarking Package ($950)
- Dashed borders, separated by horizontal divider
- Visual mark: B logomark (40px) + "Focus Studio" wordmark (Fraunces)
- Shared intake page at `/focus-studio`

**Visual Hierarchy Rule**: Core Services always takes visual precedence over Focus Studio.

**Unique Features**:
- RGB border animations on secondary CTAs
- Ethereal text glow on hover states
- Three RGB spotlights (mobile hero only)
- Formspree integration for contact form
- Pricing gate system with magic link access
- Sub-brand visual system (Core Services + Focus Studio)

**Key Files**:
```
src/
├── index.html
├── thanks.html          # Form submission confirmation
├── pages/
│   └── ads/
│       ├── direction-session.html
│       ├── founders-check.html
│       └── focus-studio.html    # B Focus Studio intake
├── styles/
│   ├── tokens.css
│   └── main.css
└── assets/
    ├── bertrand-brands-logomark.png
    └── bertrand-brands-wordmark.png
```

**Vercel Configuration** (`vercel.json`):
- Redirects: /about, /services, /process, /contact → hash anchors
- Rewrites: /focus-studio → /pages/ads/focus-studio.html
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
- `POST /api/pricing/request-access` — Send pricing magic link email
- `GET /api/pricing/access?token=xxx` — Validate magic link, create session
- `GET /api/pricing/check-access` — Check if user has pricing access
- `POST /api/pricing/logout` — End pricing session

**Protected (Auth Required)**:
- All `/dashboard/*` routes
- All `/portal/*` routes

### 7.6 Form Submission Flow

1. User submits form on bertrandbrands.com
2. Form submitted to Formspree (primary handler)
3. Formspree sends email notification to configured address
4. Formspree webhook triggers `/api/intake/formspree` on system-build
5. Rate limiting checked (Upstash Redis)
6. Spam detection applied
7. Lead created in database
8. Pushover notification sent via `/api/notify` on bertrandbrands.com
9. User sees success message on page

### 7.7 Pricing Gate System

Gated pricing access for advanced services on bertrandbrands.com:

**Flow**:
1. User clicks "View Pricing" on gated service card
2. Modal prompts for email (optional first name)
3. Magic link sent via Resend (15-minute expiry)
4. User clicks link, session created (4-hour expiry)
5. Cookie `bb_pricing_session` set on `.bertrandbrands.com` domain
6. Pricing revealed on service cards

**Database Tables** (Prisma):
```prisma
model pricing_magic_links {
  id        String    @id @db.Uuid
  email     String
  tokenHash String    @unique @map("token_hash")
  expiresAt DateTime  @map("expires_at")
  usedAt    DateTime? @map("used_at")
  createdAt DateTime  @map("created_at")
}

model pricing_sessions {
  id        String   @id @db.Uuid
  email     String
  expiresAt DateTime @map("expires_at")
  createdAt DateTime @map("created_at")
}
```

**Note**: Cookies set with `Domain=.bertrandbrands.com` to work across subdomains.

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
| 4.0.2 | Jan 2026 | Pricing gate integration with system-build, simplified notification flow, cross-subdomain cookies |
| 4.0.3 | Jan 2026 | Client Portal v1 + Admin CRM v1 locked specs (Feb 3 launch target) |
| 4.0.4 | Jan 2026 | Payment Integration v1 (Stripe Payment Links) |
| 4.0.5 | Jan 2026 | Bertrand Brands service architecture (B Core Services + B Focus Studio sub-brands) |
| 1.2.0 (platform) | Apr 2026 | Bertrand Brands Platform Workstream C Phase 1: single-page Delivery Room at `/p/[publicId]`, legacy route redirects, portal list rewrite using StatusPill, label translation module established, light-mode hotfix (dark-only enforced). |

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
DATABASE_URL_UNPOOLED=    # For Prisma migrations

# Auth
AUTH_SECRET=
AUTH_RESEND_KEY=
RESEND_API_KEY=
RESEND_FROM_EMAIL=        # Default: Bertrand Brands <hello@bertrandbrands.com>

# Rate Limiting
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Notifications
PUSHOVER_USER_KEY=
PUSHOVER_API_TOKEN=

# Pricing Gate (optional overrides)
PRICING_MAGIC_LINK_TTL_MINUTES=   # Default: 15
PRICING_SESSION_HOURS=            # Default: 4
PRICING_APP_URL=                  # Default: https://bertrandbrands.com
```

---

## 13. Client Portal v1 ("Delivery Room") — LOCKED SPEC

**Effective**: Jan 2026
**Launch target**: Feb 3, 2026
**Applies to**: clients.bertrandbrands.com

This section is additive. Do not remove or modify existing CLAUDE.md instructions. All rules below are hard constraints for Client Portal v1.

### 13.1 Product Intent

The client portal is **not a dashboard**. It is a calm, minimal **Delivery Room** whose sole purpose is to:

- Show status clearly
- Deliver work safely
- Capture feedback and approval cleanly

**If a feature does not reduce client anxiety, prevent scope creep, or enforce release gates, do not implement it.**

### 13.2 Access & Auth (Locked)

- Continue using Auth.js magic link authentication
- No unauthenticated or "anyone-with-link" access in v1
- Enforce project-level access:
  - `INTERNAL_ADMIN` → all projects
  - `CLIENT` → only projects assigned to their `client_id`
- Do not expose internal IDs in URLs; use `Project.public_id`

### 13.3 Routing (Locked)

- Canonical client route: `/p/[publicId]`
- If legacy routes exist (e.g. `/portal/projects/[id]`), redirect to canonical route

### 13.4 Data Model Extensions (Required)

**Project** — Add:
- `public_id` (string, unique, URL-safe)
- `payment_status` (unpaid | paid)
- `stage` (scheduled | in_delivery | in_review | approved | released | complete)
- `next_milestone_label`
- `next_milestone_due_at`
- `last_update_at`

**Deliverables** — Either extend `file_assets` or add a new table `deliverables`:
- `id`
- `project_id`
- `title`
- `version` (int)
- `state` (draft | review | final)
- `file_preview_url` (watermarked)
- `file_download_url` (gated; clean only when released)
- `created_at`

**Feedback** — Add table:
- `project_id`
- `deliverable_id`
- `type` (approve | approve_minor | needs_revision)
- `notes` (required if needs_revision)
- `submitted_by_name`
- `created_at`

**Sign-off / Events** — Add table or reuse audit log:
- `project_id`
- `deliverable_id`
- `signed_by_name`
- `signed_at`
- `action` (approved_and_released | signed_off)

### 13.5 Portal Layout (Single Page, Ordered)

1. **Header** (project title, client name, support email, status pill)
2. **Status Card** (current stage, next milestone + due date, last update)
3. **Scope Summary** (offer, included, excluded boundary, revision policy)
4. **Deliverables** (latest version only)
5. **Feedback + Sign-off**

**Do not expose**:
- tasks
- milestones
- internal notes
- chat/messaging

### 13.6 Gating Rules (Hard)

**If `payment_status !== paid`**:
- Allow preview viewing only (watermarked)
- Disable or hide clean download

**If `payment_status === paid` and `stage !== released`**:
- Downloads (if enabled) must be watermarked

**If `payment_status === paid` and `stage === released`**:
- Unlock clean download (no watermark)

**Approval action**:
- Requires payment complete
- Records feedback + sign-off
- Sets `stage = released`
- Marks latest deliverable as `final`

### 13.7 Watermarking (v1 Requirement)

- Text: `DRAFT — PREVIEW ONLY`
- Subtle, non-hostile (3–6% opacity)
- Use system font
- Apply to: PDFs, visual assets
- Never watermark final released files

**Raw file URLs must never be exposed without gating.**

### 13.8 Website Deliverables (Special Case)

A website is a deployment, not a file.

For website projects:
- Deliverable type: `WEBSITE_RELEASE`
- Portal displays:
  - Live production URL
  - Release notes
  - Handoff checklist (access granted Y/N)
  - Handoff document (PDF)
- Credentials are never stored in the portal
- Approval = "Approve Launch" and records sign-off

### 13.9 Definition of Done (Client Portal v1)

- [ ] Client can view project status + scope clearly
- [ ] Client can preview draft work safely
- [ ] Client cannot download clean files pre-payment or pre-release
- [ ] Client can submit structured feedback
- [ ] Client can approve and release work
- [ ] Clean files unlock only after release
- [ ] No portal bloat

---

## 14. Admin / CRM Dashboard v1 — LOCKED SPEC

**Effective**: Jan 2026
**Launch target**: Feb 3, 2026
**Applies to**: dashboard.bertrandbrands.com
**Audience**: INTERNAL_ADMIN only

This section is additive. Do not modify or remove existing CLAUDE.md instructions. All rules below are hard constraints for Admin / CRM v1.

### 14.1 Admin CRM North Star

The Admin Dashboard is **not a generic CRM**. It is a **control cockpit for a solo operator**.

**Primary goals**:
- Prevent dropped balls
- Enforce scope + payment discipline
- Minimize cognitive load
- Make "what do I do next?" undeniable

**If a feature does not directly serve one of these goals, do not build it.**

### 14.2 Access & Scope (Locked)

- Only users with role `INTERNAL_ADMIN` may access the admin dashboard
- No client-visible routes or components may be reused here
- No multi-admin collaboration assumptions in v1

### 14.3 Core Objects (Authoritative)

The Admin CRM is built around **five canonical objects only**:

1. Clients
2. Projects
3. Deliverables
4. Feedback
5. Invoices / Payment Status

**Do not introduce**:
- tasks (beyond single "next action")
- tickets
- chats
- kanban boards
- time tracking

### 14.4 Admin Dashboard Layout (v1)

**Home / Overview (Default)** must surface, at minimum:

- Projects missing a next action
- Projects due in next 72 hours
- Projects awaiting client feedback
- Projects blocked by unpaid status
- Recent client approvals / sign-offs

**This page is your daily operating system.**

### 14.5 Client Management (Admin)

Client record must include:
- Display name
- Legal name (optional)
- Primary contact email
- Assigned projects
- Status (active / dormant / archived)

**Hard rules**:
- One canonical client record
- No duplicate clients
- Client deletion disabled if projects exist (archive instead)

### 14.6 Project Management (Admin)

Project record must expose:
- Client
- Offer type
- Stage
- Payment status
- Scope summary (included + excluded)
- Next milestone label + due date
- Internal notes (admin-only)
- Deliverables list (versioned)

**Required rules**:

Every project must always have:
- a valid stage
- a next milestone label
- a next milestone due date

Projects cannot enter `in_delivery` unless `payment_status` is `paid` (override requires admin confirmation note).

### 14.7 Deliverables (Admin)

Admin must be able to:
- Create a new deliverable version
- Increment version automatically
- Upload preview + final assets
- Mark state: `draft` → `review` → `final`
- See which version is currently client-visible

**Hard rules**:
- Never overwrite a deliverable file; always version
- Only one deliverable can be `final` at a time
- Changing deliverables updates `project.last_update_at`

### 14.8 Feedback & Revisions (Admin)

Admin view must:

Show feedback tied to:
- project
- deliverable version

Clearly mark:
- approval
- approval with notes
- revision requested

**On "needs revision"**:
- Automatically set project stage → `in_delivery`
- Flag project in Admin Overview as "Revision Requested"

### 14.9 Approval, Release & Sign-Off (Admin)

Admin must be able to:
- See approval history (who, when, what version)
- Manually override stage in edge cases (logged)

**On client approval**:
- Confirm payment status
- Transition project → `released`
- Unlock clean download for client
- Log sign-off event

**Sign-off events must be immutable.**

### 14.10 Payment Discipline (Admin)

Admin dashboard should:
- Show `payment_status` clearly everywhere
- Block:
  - clean downloads
  - release
  - delivery start if unpaid (unless admin override)

Billing UI is out of scope for v1. Use existing `invoices` table as source of truth.

### 14.11 Next-Action Enforcement (Critical)

Each project must have exactly one primary "Next Action":
- Label (string)
- Due date (date)

Admin dashboard must surface:
- Projects missing a next action
- Overdue next actions

**No multi-task lists in v1.**

### 14.12 Guardrails & Safety Nets

Prevent deletion of:
- projects with deliverables
- deliverables with feedback

Require confirmation for:
- payment overrides
- stage regression

Log all overrides to audit/events table.

### 14.13 Admin UX Rules

- Fewer screens > more screens
- Tables > kanban
- Filters > custom views
- Default sort: urgency first

**No decorative analytics.**

### 14.14 Definition of Done (Admin v1)

- [ ] You can see what needs attention in <30 seconds
- [ ] No project can exist without: stage, next action, due date
- [ ] No clean deliverable can be released without: payment, approval
- [ ] You can version, upload, release, and archive cleanly
- [ ] System actively prevents common solo-operator mistakes

---

## 15. Payment Integration v1 — LOCKED SPEC

**Effective**: Jan 2026
**Applies to**: system-build (dashboard.bertrandbrands.com + clients.bertrandbrands.com)

This section is additive. All rules below are hard constraints for Payment Integration v1.

### 15.1 Approach (Minimal)

Use **Stripe Payment Links** — no custom checkout UI in v1.

### 15.2 Data Model

- Store Stripe payment link URL on `Invoice` or `Project`
- No need for full Stripe customer/subscription sync in v1

### 15.3 Webhook Handler (Required)

Implement Stripe webhook endpoint:

**On successful payment event (`checkout.session.completed` or `payment_intent.succeeded`)**:
- Set `project.payment_status = "paid"`
- Log event in audit log
- Optionally advance `stage` → `in_delivery` (if currently `scheduled`)

### 15.4 Client Portal Behavior

**If `payment_status === "unpaid"`**:
- Show "Pay to Start" or "Pay to Unlock" CTA linking to Stripe Payment Link
- Allow preview viewing only (watermarked)
- Disable clean downloads

**If `payment_status === "paid"`**:
- Unlock normal workflow per Section 13 gating rules

### 15.5 Out of Scope (v1)

- Full billing history UI
- Invoice generation
- Subscription management
- Stripe Customer Portal integration
- Refund handling UI

### 15.6 Definition of Done (Payment v1)

- [ ] Stripe Payment Link URL can be stored on project/invoice
- [ ] Webhook receives payment events and updates `payment_status`
- [ ] Payment events logged to audit log
- [ ] Client portal shows pay CTA when unpaid
- [ ] Paid status unlocks normal deliverable workflow

---

**End of Instructions**
