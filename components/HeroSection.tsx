"use client";

import { motion } from "motion/react";
import { TextReveal, estimateStreamDuration } from "./TextReveal";
import { DitherField, pulseDitherAt } from "./DitherField";
import { useLocale } from "./LocaleProvider";
import { useEntrance } from "./EntranceProvider";
import { getContent } from "@/lib/content";
import { EASE } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

// On a first visit the hero waits for the Navigation entrance sequence to finish
const FIRST_VISIT_DELAY = 3.0;
// Brief pause between headline lines, like hitting Enter
const LINE_PAUSE = 0.25;

export function HeroSection() {
  const locale = useLocale();
  const { headline, description, scrollLabel } = getContent(locale).hero;
  const { isFirstVisit, ready } = useEntrance();
  const reduceMotion = usePrefersReducedMotion();

  // textActive gates TextReveal animation start.
  // For return visits (isFirstVisit=false): active from the start.
  // For first visits: active once fonts are ready.
  const textActive = !isFirstVisit || ready;

  // On first visit, shift all delays so hero starts after nav entrance.
  // These delays are relative to when textActive becomes true.
  const d = isFirstVisit ? FIRST_VISIT_DELAY : 0;

  // Compute line start times based on actual text length + a short "newline" pause
  const line1Start = d;
  const line1End = line1Start + estimateStreamDuration(headline[0]);
  const line2Start = line1End + LINE_PAUSE;
  const line2End = line2Start + estimateStreamDuration(headline[1]);
  const line3Start = line2End + LINE_PAUSE;
  const line3End = line3Start + estimateStreamDuration(headline[2]);

  // entranceWaiting: first visit, not ready yet → description/indicator hidden
  const entranceWaiting = isFirstVisit && !ready;

  return (
    <section className="relative flex min-h-[90vh] items-end overflow-hidden px-6 pb-24 pt-32 lg:px-12">
      <div
        data-entrance-el
        className="absolute inset-0 transition-opacity duration-2000"
        style={{ opacity: entranceWaiting ? 0 : 1 }}
      >
        <DitherField />
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-11">
            {/* Below lg no headline line fits on one line in both locales, so the lines
                flow as one balanced paragraph; from lg each line is its own row. The
                lg/xl sizes and column span are the largest that fit the longest French
                line on one row. */}
            <h1 data-entrance-el className="text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl xl:text-8xl">
              <span className="lg:block">
                <TextReveal delay={line1Start} trigger="mount" onType={pulseDitherAt} cursorUntil={line2Start} active={textActive}>{headline[0]}</TextReveal>
              </span>{" "}
              <span className="lg:block">
                <TextReveal delay={line2Start} trigger="mount" onType={pulseDitherAt} cursorUntil={line3Start} active={textActive}>{headline[1]}</TextReveal>
              </span>{" "}
              <span className="lg:block">
                <TextReveal delay={line3Start} trigger="mount" onType={pulseDitherAt} active={textActive}>{headline[2]}</TextReveal>
              </span>
            </h1>

            <motion.p
              data-entrance-el
              className="mt-8 max-w-lg font-sans text-lg leading-relaxed text-muted md:text-xl"
              initial={false}
              animate={entranceWaiting
                ? { opacity: 0, y: 20 }
                : { opacity: 1, y: 0 }
              }
              transition={entranceWaiting
                ? { duration: 0 }
                : { duration: 0.7, delay: line3End + 0.4, ease: EASE }
              }
            >
              {description}
            </motion.p>
          </div>
        </div>

        <motion.div
          data-entrance-el
          className="mt-20 flex justify-start"
          initial={false}
          animate={entranceWaiting
            ? { opacity: 0 }
            : { opacity: 1 }
          }
          transition={entranceWaiting
            ? { duration: 0 }
            : { duration: 0.6, delay: line3End + 0.8 }
          }
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
              {scrollLabel}
            </span>
            <motion.div
              className="h-8 w-px bg-muted"
              animate={reduceMotion ? { scaleY: 1 } : { scaleY: [0, 1, 0] }}
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
