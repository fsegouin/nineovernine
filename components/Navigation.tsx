"use client";

import Link from "next/link";
import { useState } from "react";
import { Magnetic } from "./Magnetic";

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Magnetic strength={0.2}>
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            9<span className="text-muted">/</span>9
          </Link>
        </Magnetic>

        {/* Desktop nav */}
        <div className="hidden items-center gap-10 sm:flex">
          <Magnetic>
            <Link
              href="/#work"
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Work
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="/about"
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              About
            </Link>
          </Magnetic>
          <Magnetic>
            <Link
              href="/#contact"
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </Magnetic>
        </div>

        {/* Mobile hamburger */}
        <button
          className="flex flex-col gap-1.5 sm:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle menu"
        >
          <span
            className={`block h-px w-5 bg-foreground transition-all duration-300 ${
              menuOpen ? "translate-y-[3.5px] rotate-45" : ""
            }`}
          />
          <span
            className={`block h-px w-5 bg-foreground transition-all duration-300 ${
              menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""
            }`}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-border px-6 pb-6 pt-4 sm:hidden">
          <div className="flex flex-col gap-4">
            <Link
              href="/#work"
              onClick={() => setMenuOpen(false)}
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Work
            </Link>
            <Link
              href="/about"
              onClick={() => setMenuOpen(false)}
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="/#contact"
              onClick={() => setMenuOpen(false)}
              className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
