"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";

export function Footer() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <footer className="border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">
              9<span className="text-muted">/</span>9
            </p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-background/60">
              A human-led digital agency
              <br />
              built for the AI world.
            </p>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/40">
              Navigation
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/"
                className="font-sans text-sm text-background/60 transition-colors hover:text-background"
              >
                Home
              </Link>
              <Link
                href="/about"
                className="font-sans text-sm text-background/60 transition-colors hover:text-background"
              >
                About
              </Link>
            </div>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/40">
              Contact
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href="mailto:hello@nineovernine.com"
                className="font-sans text-sm text-background/60 transition-colors hover:text-background"
              >
                hello@nineovernine.com
              </a>
              <p className="font-sans text-sm text-background/60">
                London / Worldwide
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-background/10 pt-8">
          <p className="font-sans text-xs text-background/40">
            &copy; {new Date().getFullYear()} Nine Over Nine. All rights
            reserved.
          </p>
          <button
            onClick={toggleTheme}
            className="font-sans text-xs text-background/40 transition-colors hover:text-background"
          >
            {resolvedTheme === "light" ? "Dark" : "Light"}
          </button>
        </div>
      </div>
    </footer>
  );
}
