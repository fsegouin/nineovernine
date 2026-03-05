"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Magnetic } from "./Magnetic";
import { useLenis } from "./SmoothScroll";
import { useLocale } from "./LocaleProvider";
import { getContent } from "@/lib/content";
import { LanguageSwitcher } from "./LanguageSwitcher";

export function Navigation() {
  const locale = useLocale();
  const content = getContent(locale);
  const { links } = content.nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoMorphed, setLogoMorphed] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const lenisRef = useLenis();
  const pathname = usePathname();

  const handleLogoClick = useCallback(() => {
    if (logoMorphed) return;
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, 2000);
    if (clickCount.current >= 9) {
      clickCount.current = 0;
      setLogoMorphed(true);
      setTimeout(() => setLogoMorphed(false), 3000);
    }
  }, [logoMorphed]);

  const localePath = `/${locale}`;

  const handleAnchorClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, hash?: string) => {
      // Only smooth-scroll when already on the home page
      if (!hash || pathname !== localePath) return;

      const target = document.querySelector(hash);
      if (target && lenisRef.current) {
        e.preventDefault();
        lenisRef.current.scrollTo(target as HTMLElement, { offset: -64 });
      }
    },
    [pathname, lenisRef, localePath]
  );

  return (
    <header className="bg-grain sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Magnetic strength={0.2}>
          <Link
            href={localePath}
            className="relative font-display text-lg font-bold tracking-tight"
            onClick={handleLogoClick}
            data-party-logo
          >
            <AnimatePresence mode="wait">
              {logoMorphed ? (
                <motion.span
                  key="infinity"
                  initial={{ scale: 0.5, rotate: -180, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: 180, opacity: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  &infin;<span className="text-muted">/</span>&infin;
                </motion.span>
              ) : (
                <motion.span
                  key="logo"
                  initial={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, rotate: -180, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block"
                >
                  9<span className="text-muted">/</span>9
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </Magnetic>

        {/* Desktop nav */}
        <div className="hidden items-center gap-10 sm:flex">
          {links.map((link) => (
            <Magnetic key={link.href}>
              <Link
                href={`${localePath}${link.href}`}
                onClick={(e) => handleAnchorClick(e, link.hash)}
                className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            </Magnetic>
          ))}
          <Magnetic strength={0.3}>
            <LanguageSwitcher />
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
            {links.map((link) => (
              <Link
                key={link.href}
                href={`${localePath}${link.href}`}
                onClick={(e) => { setMenuOpen(false); handleAnchorClick(e, link.hash); }}
                className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </header>
  );
}
