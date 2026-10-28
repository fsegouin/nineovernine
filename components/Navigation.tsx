"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Magnetic } from "./Magnetic";
import { useLenis } from "./SmoothScroll";
import { useLocale } from "./LocaleProvider";
import { useEntrance } from "./EntranceProvider";
import { getContent } from "@/lib/content";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { EASE } from "@/lib/motion";

const LOGO_CLICKS_TO_MORPH = 9;
const LOGO_CLICK_WINDOW_MS = 2000;
const LOGO_MORPH_MS = 3000;
const ANCHOR_SCROLL_OFFSET = -64;

export function Navigation() {
  const locale = useLocale();
  const content = getContent(locale);
  const { links, menuLabel, logoLabel, mainLabel } = content.nav;
  const { isFirstVisit, ready } = useEntrance();
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoMorphed, setLogoMorphed] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout>>(null);
  const lenisRef = useLenis();
  const pathname = usePathname();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuPathname, setMenuPathname] = useState(pathname);

  // Close the mobile menu when the route changes (adjusting state during render)
  if (menuPathname !== pathname) {
    setMenuPathname(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  // Entrance states:
  // - entranceWaiting: first visit, fonts not ready → elements should be hidden
  // - entranceActive: first visit, fonts ready → elements should animate in
  // - neither: return visit → elements visible immediately, no animation
  const entranceWaiting = isFirstVisit && !ready;
  const entranceActive = isFirstVisit && ready;

  const handleLogoClick = useCallback(() => {
    if (logoMorphed) return;
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => { clickCount.current = 0; }, LOGO_CLICK_WINDOW_MS);
    if (clickCount.current >= LOGO_CLICKS_TO_MORPH) {
      clickCount.current = 0;
      setLogoMorphed(true);
      setTimeout(() => setLogoMorphed(false), LOGO_MORPH_MS);
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
        lenisRef.current.scrollTo(target as HTMLElement, { offset: ANCHOR_SCROLL_OFFSET });
        // Move focus with the scroll so the next Tab continues from the section;
        // the sections are tabIndex={-1} targets
        (target as HTMLElement).focus({ preventScroll: true });
      }
    },
    [pathname, lenisRef, localePath]
  );

  return (
    <motion.header
      data-entrance-el
      className="bg-grain sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md"
      initial={false}
      animate={entranceWaiting
        ? { y: "-100%", opacity: 0 }
        : { y: 0, opacity: 1 }
      }
      transition={entranceActive
        ? { duration: 0.8, delay: 0.3, ease: EASE }
        : { duration: 0 }
      }
    >
      <nav aria-label={mainLabel} className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-12">
        <Magnetic strength={0.2}>
          <Link
            href={localePath}
            className="relative font-display text-lg font-bold tracking-tight"
            aria-label={logoLabel}
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
                  transition={{ duration: 0.4, ease: EASE }}
                  className="inline-block"
                >
                  &infin;<span className="text-muted">/</span>&infin;
                </motion.span>
              ) : (
                <motion.span
                  key="logo"
                  data-entrance-el
                  initial={false}
                  animate={entranceWaiting
                    ? { scale: 0.95, opacity: 0 }
                    : { scale: 1, opacity: 1 }
                  }
                  exit={{ scale: 0.5, rotate: -180, opacity: 0 }}
                  transition={entranceActive
                    ? { duration: 0.8, delay: 1.2, ease: EASE }
                    : entranceWaiting
                      ? { duration: 0 }
                      : { duration: 0.3, ease: EASE }
                  }
                  className="inline-block"
                >
                  9<span className="text-muted">/</span>9
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </Magnetic>

        <div className="hidden items-center gap-10 sm:flex">
          {links.map((link, i) => (
            <Magnetic key={link.href}>
              <motion.div
                data-entrance-el
                initial={false}
                animate={entranceWaiting
                  ? { opacity: 0, y: -8 }
                  : { opacity: 1, y: 0 }
                }
                transition={entranceActive
                  ? { duration: 0.5, delay: 2.2 + i * 0.15, ease: EASE }
                  : { duration: 0 }
                }
              >
                <Link
                  href={`${localePath}${link.href}`}
                  onClick={(e) => handleAnchorClick(e, link.hash)}
                  aria-current={pathname === `${localePath}${link.href}` ? "page" : undefined}
                  className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              </motion.div>
            </Magnetic>
          ))}
          <Magnetic strength={0.3}>
            <motion.div
              data-entrance-el
              initial={false}
              animate={entranceWaiting
                ? { opacity: 0, y: -8 }
                : { opacity: 1, y: 0 }
              }
              transition={entranceActive
                ? { duration: 0.5, delay: 2.2 + links.length * 0.15, ease: EASE }
                : { duration: 0 }
              }
            >
              <LanguageSwitcher />
            </motion.div>
          </Magnetic>
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="-m-3 flex flex-col gap-1.5 p-3 sm:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuLabel}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
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

      {menuOpen && (
        <div id="mobile-menu" className="border-t border-border px-6 pb-6 pt-4 sm:hidden">
          <div className="flex flex-col gap-4">
            {links.map((link) => (
              <Link
                key={link.href}
                href={`${localePath}${link.href}`}
                onClick={(e) => { setMenuOpen(false); handleAnchorClick(e, link.hash); }}
                aria-current={pathname === `${localePath}${link.href}` ? "page" : undefined}
                className="font-sans text-sm tracking-wide text-muted transition-colors hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
            <LanguageSwitcher />
          </div>
        </div>
      )}
    </motion.header>
  );
}
