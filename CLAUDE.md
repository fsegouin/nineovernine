# nineovernine

Portfolio/agency website built with Next.js 16, React 19, Tailwind CSS 4, and Motion (Framer Motion).

## Stack

- **Framework**: Next.js 16 (App Router)
- **Package manager**: pnpm
- **Styling**: Tailwind CSS 4 (no tailwind.config — uses CSS-based config in globals.css)
- **Animation**: Motion (motion/react)
- **Smooth scroll**: Lenis
- **Fonts**: Inter Variable, Jost Variable (@fontsource-variable)

## Git

- Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for all commit messages.
  - Format: `<type>: <description>` (e.g., `fix: resolve cursor visibility on light theme`)
  - Common types: `feat`, `fix`, `chore`, `refactor`, `style`, `docs`, `perf`, `test`

## Custom Cursor

- Custom cursor component at `components/Cursor.tsx` replaces the native cursor on pointer devices.
- Uses `mix-blend-difference` with `bg-white` for contrast on both light and dark themes.
- Scales up (5×) on hover over `a`, `button`, and `[data-cursor]` elements.
- Default cursor is hidden globally via `cursor: none !important` in `globals.css`.
