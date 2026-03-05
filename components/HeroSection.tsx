"use client";

import { motion } from "motion/react";
import { TextReveal } from "./TextReveal";
import { DitherField } from "./DitherField";
import { useLocale } from "./LocaleProvider";
import { useEntrance } from "./EntranceProvider";
import { getContent } from "@/lib/content";

const EASE = [0.22, 1, 0.36, 1] as const;

export function HeroSection() {
  const locale = useLocale();
  const { headline, description, scrollLabel } = getContent(locale).hero;
  const { isFirstVisit, ready } = useEntrance();

  // textActive gates TextReveal animation start.
  // For return visits (isFirstVisit=false): active from the start.
  // For first visits: active once fonts are ready.
  const textActive = !isFirstVisit || ready;

  // On first visit, shift all delays so hero starts after nav entrance.
  // These delays are relative to when textActive becomes true.
  const d = isFirstVisit ? 0.6 : 0;

  // entranceWaiting: first visit, not ready yet → description/indicator hidden
  const entranceWaiting = isFirstVisit && !ready;

  return (
    <section className="relative flex min-h-[90vh] items-end overflow-hidden px-6 pb-24 pt-32 lg:px-12">
      <div
        className="absolute inset-0 transition-opacity duration-1200"
        style={{ opacity: entranceWaiting ? 0 : 1 }}
      >
        <DitherField />
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-10">
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              <TextReveal delay={d + 0.2} trigger="mount" cursorUntil={d + 0.9} active={textActive}>{headline[0]}</TextReveal>
              <br />
              <TextReveal delay={d + 0.9} trigger="mount" cursorUntil={d + 1.75} active={textActive}>{headline[1]}</TextReveal>
              <br />
              <TextReveal delay={d + 1.75} trigger="mount" active={textActive}>{headline[2]}</TextReveal>
            </h1>

            <motion.p
              className="mt-8 max-w-lg font-sans text-lg leading-relaxed text-muted md:text-xl"
              initial={false}
              animate={entranceWaiting
                ? { opacity: 0, y: 20 }
                : { opacity: 1, y: 0 }
              }
              transition={{
                duration: 0.7,
                delay: entranceWaiting ? 0 : d + 3.2,
                ease: EASE,
              }}
            >
              {description}
            </motion.p>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-20 flex justify-start"
          initial={false}
          animate={entranceWaiting
            ? { opacity: 0 }
            : { opacity: 1 }
          }
          transition={{
            duration: 0.6,
            delay: entranceWaiting ? 0 : d + 3.6,
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
              {scrollLabel}
            </span>
            <motion.div
              className="h-8 w-px bg-muted"
              animate={{ scaleY: [0, 1, 0] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              style={{ transformOrigin: "top" }}
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
