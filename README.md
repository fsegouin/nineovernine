# nineovernine

Portfolio and agency website for a human-led digital agency. Built with Next.js 16, React 19, Tailwind CSS 4, and Motion.

## Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router), React 19
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) — CSS-based config via `@theme inline`, no `tailwind.config`
- **Animation**: [Motion](https://motion.dev/) (formerly Framer Motion)
- **Smooth scroll**: [Lenis](https://lenis.darkroom.engineering/)
- **Fonts**: Jost Variable (headings), Inter Variable (body) — self-hosted
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
```

## Project Structure

```
app/
  layout.tsx            # Root layout: fonts, providers, nav, footer, grain overlay
  globals.css           # Design tokens, Tailwind config, global rules
  page.tsx              # Home — composed of section components
  about/page.tsx        # About page
  projects/[slug]/      # Dynamic project detail (statically pre-rendered)
  robots.ts             # Disallows all crawlers (pre-launch)
components/
  Navigation.tsx        # Sticky header, frosted glass, mobile hamburger
  Footer.tsx            # Inverted bg, nav links, theme toggle
  ThemeProvider.tsx      # Dark/light mode context + localStorage
  SmoothScroll.tsx      # Lenis wrapper
  Cursor.tsx            # Custom animated cursor (pointer:fine only)
  Magnetic.tsx          # Magnetic hover effect wrapper
  FadeIn.tsx            # Scroll-triggered fade+translate animation
  TextReveal.tsx        # Character-by-character streaming text
  DitherField.tsx       # Interactive dither pattern background (canvas)
  ProjectTransition.tsx # Shared-element page transition
  ProjectContent.tsx    # Project detail page content
  HeroSection.tsx       # Home hero with streaming headline + dither field
  ServicesSection.tsx    # Services grid
  WorkSection.tsx       # Project cards grid
  PhilosophySection.tsx # Inverted philosophy block
  ContactSection.tsx    # Contact CTA
lib/
  projects.ts           # Static project data array + helpers
  content.json          # Site copy and metadata
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

### Layout

- **Max width**: `max-w-7xl` (1280px) centered container
- **Padding**: `px-6 lg:px-12` horizontal, `py-24 lg:py-32` vertical
- **Grid**: 12-column for asymmetric layouts (7+5 or 5+7)

## License

Private — all rights reserved.
