# nineovernine

Portfolio/agency website for a human-led digital agency. Built with Next.js 16, React 19, Tailwind CSS 4, and Motion.

## Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Package manager**: pnpm
- **Styling**: Tailwind CSS 4 — no `tailwind.config`, all config in `globals.css` via `@theme inline`
- **Animation**: Motion (`motion/react`, formerly Framer Motion)
- **Smooth scroll**: Lenis (`lerp: 0.1`, `smoothWheel: true`)
- **Fonts**: Jost Variable (display/headings, `font-display`), Inter Variable (body, `font-sans`) — self-hosted in `public/fonts/`, loaded via `next/font/local`

## Git

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.
  - Format: `<type>: <description>` (e.g., `fix: resolve cursor visibility on light theme`)
  - Common types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `perf`, `test`
- **One commit per feature/fix.** Never combine unrelated changes in the same commit. When multiple features were worked on, break them into separate commits.

## Project Structure

```
app/
  layout.tsx          # Root layout: fonts, providers, nav, footer, grain overlay
  globals.css         # Design tokens, Tailwind config, global rules
  page.tsx            # Home — composed of section components
  about/page.tsx      # About page
  projects/[slug]/    # Dynamic project detail (statically pre-rendered)
  robots.ts           # Disallows all crawlers (pre-launch)
components/
  Navigation.tsx      # Sticky header, frosted glass, mobile hamburger
  Footer.tsx          # Inverted bg, nav links, theme toggle
  ThemeProvider.tsx    # Dark/light mode context + localStorage
  SmoothScroll.tsx    # Lenis wrapper
  Cursor.tsx          # Custom animated cursor
  Magnetic.tsx        # Magnetic hover effect wrapper
  FadeIn.tsx          # Scroll-triggered fade+translate animation
  TextReveal.tsx      # Character-by-character streaming text
  ProjectTransition.tsx # Shared-element page transition
  ProjectContent.tsx  # Project detail page content
  HeroSection.tsx     # Home hero with streaming headline
  ServicesSection.tsx  # Services grid (server component)
  WorkSection.tsx     # Project cards grid
  PhilosophySection.tsx # Inverted philosophy block (server component)
  ContactSection.tsx  # Contact CTA (server component)
lib/
  projects.ts         # Static project data array + helpers
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

## Dark/Light Mode

Three-layer system to prevent FOUC:

1. **CSS**: `@media (prefers-color-scheme: dark)` applies dark tokens to `:root:not(.light)`
2. **Inline script** (in `layout.tsx`): Runs before paint, reads `localStorage("theme")`, sets `.dark`/`.light` class on `<html>` and `theme-color` meta
3. **React** (`ThemeProvider`): Syncs state after hydration, provides `useTheme()` hook with `toggleTheme()`

## Animation Patterns

- **Shared easing**: `[0.22, 1, 0.36, 1]` (expo ease-out) used across multiple files as `EASE` constant
- **Scroll-triggered**: `FadeIn` uses `whileInView` with `once: true`, `margin: "-80px"`, default direction `up` (y: 24→0)
- **Staggered entrances**: Lists use `delay={i * 0.08}` or `delay={i * 0.1}`
- **Spring physics**: Cursor position (`damping: 25, stiffness: 250, mass: 0.5`), Magnetic (`stiffness: 200, damping: 15, mass: 0.5`)
- **Text streaming**: `TextReveal` — 40ms per character, blinking cursor tracks position, `cursorUntil` prop for chaining across elements

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
- Static data co-located in component files (services) or in `lib/` (shared project data)
- `Magnetic` wrapper used on interactive elements: logo (0.2), nav links (0.3), theme toggle (0.4), email link (0.15)

## Special Features

- **Custom cursor**: 12px white dot with `mix-blend-difference`, scales 5× on hover over `a`/`button`/`[data-cursor]`, only on `pointer: fine` devices
- **Grain overlay**: SVG `feTurbulence` filter as inline data URI, `opacity: 0.04`, `z-100`. Rendered as DOM element (not `::before`) to avoid Safari iOS 26 tab-tinting bug
- **Project transitions**: Shared-element animation — card expands to full-width hero position, page navigates mid-animation. Chainable between project pages via "next project" section
- **`robots.ts`**: Currently disallows all crawlers (site is pre-launch)

## Key Z-Index Layers

| Layer | Z-Index |
|---|---|
| Navigation | `z-50` |
| Project transition overlay | `z-40` |
| Grain overlay | `z-100` |
| Custom cursor | `z-[200]` |
