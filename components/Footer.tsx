"use client";

import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { Magnetic } from "./Magnetic";
import content from "@/lib/content.json";

const { tagline, navLabel, navLinks, contactLabel, copyright } = content.footer;
const { email, location } = content.contact;

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
              {tagline.split("\n").map((line, i) => (
                <span key={i}>
                  {i > 0 && <br />}
                  {line}
                </span>
              ))}
            </p>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/40">
              {navLabel}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="font-sans text-sm text-background/60 transition-colors hover:text-background"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-sans text-xs font-medium uppercase tracking-widest text-background/40">
              {contactLabel}
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={`mailto:${email}`}
                className="font-sans text-sm text-background/60 transition-colors hover:text-background"
              >
                {email}
              </a>
              <p className="font-sans text-sm text-background/60">
                {location}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex items-center justify-between border-t border-background/10 pt-8">
          <p className="font-sans text-xs text-background/40">
            &copy; {new Date().getFullYear()} {copyright}
          </p>
          <Magnetic strength={0.4}>
            <button
              onClick={toggleTheme}
              className="font-sans text-xs text-background/40 transition-colors hover:text-background"
            >
              {resolvedTheme === "light" ? "Dark" : "Light"}
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  );
}
