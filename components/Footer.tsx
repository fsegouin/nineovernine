"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useTheme } from "./ThemeProvider";
import { Magnetic } from "./Magnetic";
import { EmailLink } from "./EmailLink";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";

const subscribe = () => () => {};
const getCurrentYear = () => new Date().getFullYear();

// The page is prerendered, so the HTML carries the build's year. Hydrate with that
// value, then React re-renders with the visitor's year if it differs.
export function Footer({ buildYear }: { buildYear: number }) {
  const year = useSyncExternalStore(subscribe, getCurrentYear, () => buildYear);
  const locale = useLocale();
  const content = getContent(locale);
  const { tagline, navLabel, navLinks, contactLabel, copyright, themeToggle } = content.footer;
  const { email, location } = content.contact;
  const localePath = `/${locale}`;
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <footer className="bg-grain border-t border-border bg-foreground text-background">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-12 lg:py-20">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">
              9<span className="text-muted">/</span>9
            </p>
            <p className="mt-3 font-sans text-sm leading-relaxed text-background/60">
              {tagline.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/60">
              {navLabel}
            </p>
            <nav aria-label={navLabel} className="mt-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={`${localePath}${link.href}`}
                  className="font-sans text-sm text-background/60 transition-colors hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/60">
              {contactLabel}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <EmailLink
                email={email}
                location="footer"
                className="font-sans text-sm text-background/60 transition-colors hover:text-background"
              />
              <p className="font-sans text-sm text-background/60">
                {location}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-background/10 pt-8">
          <p className="font-sans text-xs text-background/60">
            &copy; {year} {copyright}
          </p>
          <Magnetic strength={0.4}>
            <button
              type="button"
              onClick={toggleTheme}
              className="font-sans text-xs text-background/60 transition-colors hover:text-background"
            >
              {resolvedTheme === "light" ? themeToggle.dark : themeToggle.light}
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  );
}
