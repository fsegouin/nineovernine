# nineovernine

@AGENTS.md

Portfolio/agency website for a human-led digital agency. Built with Next.js 16, React 19, Tailwind CSS 4, and Motion.

## Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Package manager**: pnpm
- **Styling**: Tailwind CSS 4, no `tailwind.config`, all config in `globals.css` via `@theme inline`
- **Animation**: Motion (`motion/react`, formerly Framer Motion)
- **Smooth scroll**: Lenis (`lerp: 0.1`, `smoothWheel: true`)
- **Fonts**: Jost Variable (display/headings, `font-display`), Inter Variable (body, `font-sans`), self-hosted in `public/fonts/`, loaded via `next/font/local`

## Git

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.
  - Format: `<type>: <description>` (e.g., `fix: resolve cursor visibility on light theme`)
  - Common types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `perf`, `test`
- **One commit per feature/fix.** Never combine unrelated changes in the same commit. When multiple features were worked on, break them into separate commits.

## Project Structure

```
app/
  globals.css         # Design tokens, Tailwind config, global rules
  global-not-found.tsx # Styled 404 for every unmatched URL (experimental.globalNotFound)
  robots.ts           # Disallows all crawlers (pre-launch)
  9/                  # /9 easter egg page with its own root layout (excluded from the locale redirect)
  api/contact/route.ts # Contact form endpoint (sends mail through Resend)
  [locale]/
    layout.tsx        # Root layout: <html lang>, fonts, inline scripts, providers, nav, footer, metadata, JSON-LD
    page.tsx          # Home, composed of section components
    opengraph-image.tsx # Home OG image
    about/page.tsx    # About page (+ opengraph-image.tsx)
    projects/[slug]/  # Dynamic project detail, statically pre-rendered (+ opengraph-image.tsx)
proxy.ts              # Locale negotiation and redirect (Next.js 16 proxy, formerly middleware)
components/
  Navigation.tsx      # Sticky header, frosted glass, mobile hamburger
  Footer.tsx          # Inverted bg, nav links, theme toggle
  LanguageSwitcher.tsx # EN/FR toggle
  LocaleProvider.tsx  # Locale context for client components
  ThemeProvider.tsx   # Dark/light mode context + localStorage
  EntranceProvider.tsx # First-visit entrance sequence state
  PartyMode.tsx       # Party mode provider (Konami code easter egg)
  ConsoleMessage.tsx  # Console easter egg message
  GrainOverlay.tsx    # Generates the grain noise tile (--grain-url)
  SmoothScroll.tsx    # Lenis wrapper
  Cursor.tsx          # Custom animated cursor
  Magnetic.tsx        # Magnetic hover effect wrapper
  FadeIn.tsx          # Scroll-triggered fade+translate animation
  TextReveal.tsx      # Character-by-character streaming text
  DitherField.tsx     # Interactive dither canvas, rendered off the main thread in dither-worker.ts
  dither-worker.ts    # Dither simulation; draws with dither-gl.ts, or Canvas 2D without WebGL2
  dither-gl.ts        # WebGL2 renderer: per-dot state pass + instanced dot pass
  dither-config.ts    # Dither tuning shared by both renderers
  ProjectTransition.tsx # Shared-element page transition
  ProjectContent.tsx  # Project detail page content
  HeroSection.tsx     # Home hero with streaming headline + dither field
  ServicesSection.tsx  # Services grid (server component)
  WorkSection.tsx     # Project cards grid
  PhilosophySection.tsx # Inverted philosophy block (server component)
  ContactSection.tsx  # Contact CTA (server component)
  ContactForm.tsx     # Multi-step contact form
  EmailLink.tsx       # mailto link that records email_link_clicked
  LoopingVideo.tsx    # Muted looping video, paused under reduced motion
  MotionPreferences.tsx # MotionConfig honouring prefers-reduced-motion
  NotFoundContent.tsx # 404 body, localised from the URL's locale segment
hooks/
  useKonamiCode.ts    # Konami code listener
  usePrefersReducedMotion.ts # Hydration-safe reduced-motion preference
lib/
  content.ts          # Locale-aware content loader (getContent, locale helpers)
  content/en.json     # English copy, metadata and project data
  content/fr.json     # French copy, metadata and project data
  projects.ts         # Project types and lookup helpers
  jsonld.ts           # JSON-LD structured data helpers
  analytics.ts        # Typed Vercel Analytics event catalogue (trackEvent)
  contact.ts          # Contact field limits and service options (form + API route)
  document.ts         # Viewport and the pre-paint theme and entrance scripts
  fonts.ts            # Jost and Inter via next/font/local
  motion.ts           # Shared EASE curve
  og-font.ts          # Jost Bold loader for OG images
  site.ts             # Site URL
  theme-class.ts      # Current theme class on <html>
scripts/              # Asset generation over lib/content/*.json (pnpm generate)
```

## Design Tokens

Defined in `globals.css` on `:root` and toggled via `.light`/`.dark` classes:

| Token | Light | Dark | Tailwind class |
|---|---|---|---|
| `--background` | `#fafafa` | `#0a0a0a` | `bg-background` |
| `--foreground` | `#0a0a0a` | `#fafafa` | `text-foreground` |
| `--muted` | `#737373` | `#a3a3a3` | `text-muted` |
| `--border` | `#e5e5e5` | `#262626` | `border-border` |
| `--surface` | `#ffffff` | `#171717` | `bg-surface` |
| `--danger` | `#dc2626` | `#f87171` | `text-danger` |

## Dark/Light Mode

Three-layer system to prevent FOUC:

1. **CSS**: `@media (prefers-color-scheme: dark)` applies dark tokens to `:root:not(.light)`
2. **Inline script** (`THEME_SCRIPT` in `lib/document.ts`, rendered by both root layouts): Runs before paint, reads `localStorage("theme")`, sets `.dark`/`.light` class on `<html>` and `theme-color` meta
3. **React** (`ThemeProvider`): Syncs state after hydration, provides `useTheme()` hook with `toggleTheme()`

## Animation Patterns

- **Shared easing**: `[0.22, 1, 0.36, 1]` (expo ease-out), exported as `EASE` from `lib/motion.ts`
- **Scroll-triggered**: `FadeIn` uses `whileInView` with `once: true`, `margin: "-80px"`, default direction `up` (y: 24→0)
- **Staggered entrances**: Lists use `delay={i * 0.08}` or `delay={i * 0.1}`
- **Spring physics**: Cursor position (`damping: 25, stiffness: 250, mass: 0.5`), Magnetic (`stiffness: 200, damping: 15, mass: 0.5`)
- **Text streaming**: `TextReveal`, about 70ms per character with a seeded human-like rhythm (variance, word pauses, hesitations); blinking cursor tracks position, `cursorUntil` prop for chaining across elements, `estimateStreamDuration` returns the same seeded timing

## Layout Conventions

- **Max width**: `max-w-7xl` (1280px) centered container for all sections
- **Padding**: `px-6 lg:px-12` horizontal, `py-24 lg:py-32` vertical
- **Grid**: 12-column (`grid-cols-12`) for asymmetric layouts (7+5 or 5+7)
- **Nav height**: `h-16` (64px), sticky with `bg-background/80 backdrop-blur-md`
- **Inverted sections**: `bg-foreground text-background` for PhilosophySection and Footer
- **Section labels**: Uppercase `text-xs tracking-[0.2em]` for overlines

## Component Patterns

- Server components by default; `"use client"` only when needed (interactivity, browser APIs, Motion, context)
- Named exports for components, default exports for pages
- Copy and project data live in `lib/content/{en,fr}.json`, read through `getContent(locale)` from `lib/content.ts`; keep both files in the same shape
- `Magnetic` wrapper used on interactive elements: logo (0.2), nav links (0.3), theme toggle (0.4), email link (0.15)

## Special Features

- **Custom cursor**: white dot with `mix-blend-difference`, drawn at its 60px hover size and scaled to 0.2 (12px) at rest so the hover state stays sharp; grows to full size over `a`/`button`/`[data-cursor]`, only on `pointer: fine` devices outside forced-colors mode. The native cursor stays until the first mouse move, and text fields keep the native I-beam with the dot hidden
- **Grain**: `GrainOverlay` draws a noise tile on a canvas in the foreground colour and sets it as `--grain-url`; `globals.css` applies it as a background image on `body` and `.bg-grain`. It regenerates when the theme changes
- **Project transitions**: Shared-element animation: card expands to full-width hero position, page navigates mid-animation. Chainable between project pages via "next project" section
- **`robots.ts`**: Currently disallows all crawlers (site is pre-launch)
- **i18n**: `en` and `fr` under `app/[locale]/`. `proxy.ts` redirects unprefixed paths using the `NEXT_LOCALE` cookie, then `Accept-Language`. `/9` and `/api` are excluded from the redirect
- **Contact form**: `ContactForm` posts JSON to `app/api/contact/route.ts`, which sends mail through Resend and needs `RESEND_API_KEY`. Each payload carries a `submissionId` the route passes to Resend as an idempotency key, so a retry after a timed-out send never mails twice. Rejections are logged by reason only, never with the visitor's input
- **Rate limiting**: the Vercel Firewall custom rule "Rate limit contact form" allows 10 `POST /api/contact` per hour per IP and returns 429 after that (managed with `vercel firewall rules`, not in the repo). The route's in-memory limiter is a per-instance backstop
- **Analytics**: Vercel Web Analytics page views plus custom events (Pro plan), all sent through `trackEvent` in `lib/analytics.ts`. Add new events to its `Events` type; never put visitor input or the email address in a property
- **Easter eggs**: `/9` page, `PartyMode` (triggered by `useKonamiCode`), `ConsoleMessage`
- **Hero dither field**: a grid of dots (8px cells) driven by Perlin noise, with a cursor flashlight, a scatter while the cursor moves, a ripple on click, and a pulse at each character the headline types (`TextReveal`'s `onType` calls `pulseDitherAt`). It renders in a worker on an OffscreenCanvas with WebGL2, capped at about 60fps (30fps when idle), paused off-screen and in hidden tabs; without WebGL2 it falls back to Canvas 2D in the same worker
- **Reduced motion**: `MotionPreferences` wraps the app in `MotionConfig reducedMotion="user"`; Lenis, the cursor trail, the dither noise, looping videos and party-mode CSS also stand down when `prefers-reduced-motion: reduce`
- **Root layouts**: `app/[locale]/layout.tsx` and `app/9/layout.tsx` are both root layouts (there is no `app/layout.tsx`), so `<html lang>` is server-rendered
- **404s**: with no root layout there is no root `not-found.js`, and a `notFound()` thrown while rendering under `[locale]` errors instead of rendering one. So `[locale]` and `projects/[slug]` set `dynamicParams = false`, which makes unknown locales and slugs unmatched URLs, and every unmatched URL renders `app/global-not-found.tsx`. Prefer that over `notFound()` in new routes
- **Reduced-motion markup**: branch rendered markup on `usePrefersReducedMotion()`, not Motion's `useReducedMotion()`, which reads the media query during hydration and mismatches the server HTML

## Key Z-Index Layers

| Layer | Z-Index |
|---|---|
| Navigation | `z-50` |
| Project transition overlay | `z-40` |
| Custom cursor (trail canvas `98`) | `z-[99]` |
| Party mode toast | `z-[200]` |
| Skip link (on focus) | `z-[300]` |
