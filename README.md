# nineovernine

Portfolio and agency website for a human-led digital agency. Built with Next.js 16, React 19, Tailwind CSS 4, and Motion.

## Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router), React 19
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/): CSS-based config via `@theme inline`, no `tailwind.config`
- **Animation**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Smooth scroll**: [Lenis](https://lenis.darkroom.engineering/)
- **Fonts**: Jost Variable (headings), Inter Variable (body), self-hosted
- **Package manager**: pnpm

## Getting Started

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other commands

```bash
pnpm build    # Production build
pnpm start    # Start production server
pnpm lint     # Run ESLint
pnpm generate # Regenerate image blur placeholders and video posters in lib/content/*.json
pnpm generate:blur # Regenerate image blur placeholders only
pnpm generate:posters # Regenerate video posters only
```

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

## Design System

### Theming

Three-layer dark/light mode system to prevent FOUC:

1. **CSS**: `@media (prefers-color-scheme: dark)` applies dark tokens to `:root:not(.light)`
2. **Inline script**: Runs before paint, reads `localStorage("theme")`, sets class on `<html>`
3. **React**: `ThemeProvider` syncs state after hydration, provides `useTheme()` hook

### Design Tokens

Defined in `globals.css` on `:root`, toggled via `.light`/`.dark` classes:

| Token | Light | Dark |
|---|---|---|
| `--background` | `#fafafa` | `#0a0a0a` |
| `--foreground` | `#0a0a0a` | `#fafafa` |
| `--muted` | `#737373` | `#a3a3a3` |
| `--border` | `#e5e5e5` | `#262626` |
| `--surface` | `#ffffff` | `#171717` |
| `--danger` | `#dc2626` | `#f87171` |

### Layout

- **Max width**: `max-w-7xl` (1280px) centered container
- **Padding**: `px-6 lg:px-12` horizontal, `py-24 lg:py-32` vertical
- **Grid**: 12-column for asymmetric layouts (7+5 or 5+7)

## License

Private. All rights reserved.
