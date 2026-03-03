"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { usePathname } from "next/navigation";
import { Magnetic } from "./Magnetic";
import { useLenis } from "./SmoothScroll";
import content from "@/lib/content.json";

const { links } = content.nav;

export function Navigation() {
  const [menuOpen, setMenuOpen] = useState(false);
  const lenisRef = useLenis();
  const pathname = usePathname();

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, hash?: string) => {
      // Only smooth-scroll when already on the home page
      if (!hash || pathname !== "/") return;

      const target = document.querySelector(hash);
      if (target && lenisRef.current) {
        e.preventDefault();
        lenisRef.current.scrollTo(target as HTMLElement, { offset: -64 });
      }
    },
    [pathname, lenisRef]
  );

  return (
    <header className="bg-grain sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Magnetic strength={0.2}>
          <Link href="/" className="font-display text-lg font-bold tracking-tight">
            9<span className="text-muted">/</span>9
          </Link>
        </Magnetic>

        {/* Desktop nav */}
        <div className="hidden items-center gap-10 sm:flex">
          {links.map((link) => (
            <Magnetic key={link.href}>
              <Link
                href={link.href}
                onClick={(e) => handleAnchorClick(e, link.hash)}
                className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </Magnetic>
          ))}
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
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => { setMenuOpen(false); handleAnchorClick(e, link.hash); }}
                className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
