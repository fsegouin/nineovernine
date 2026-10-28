"use client";

import { motion, useInView } from "motion/react";
import { memo, useEffect, useMemo, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const CHAR_DELAY = 0.07; // base seconds between characters (~115 WPM)
const CURSOR_LINGER = 5; // how long cursor stays after last char
const BLINK_CYCLE = 1; // matches cursor-blink animation duration

/** Deterministic pseudo-random from seed so timings are stable across renders. */
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** Build cumulative delay array that mimics human typing rhythm. */
function buildCharTimings(
  chars: string[],
  baseDelay: number,
  seed: number,
) {
  const rng = seededRandom(seed);
  const timings: number[] = [];
  let t = baseDelay;

  for (let i = 0; i < chars.length; i++) {
    timings.push(t);

    // Base interval with human-like variance (±20% of base)
    let interval = CHAR_DELAY * (0.8 + rng() * 0.4);

    // Slight pause at word boundaries — natural rhythm between words
    if (chars[i] === " " || chars[i + 1] === " ") {
      interval += rng() * 0.03;
    }

    // Occasional micro-hesitation (~15% chance)
    if (rng() < 0.15) {
      interval += 0.02 + rng() * 0.04;
    }

    t += Math.max(0.012, interval);
  }

  return { timings, totalTime: t - baseDelay };
}

/** Stable seed from the text content so timings don't shift on re-render. */
function seedFor(text: string) {
  return text.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 7);
}

/** Time the last character appears (for chaining delays). Uses the same
 *  seeded timings TextReveal renders, so chained lines never overlap. */
export function estimateStreamDuration(text: string) {
  if (text.length === 0) return 0;
  const { timings } = buildCharTimings(text.split(""), 0, seedFor(text));
  return timings[timings.length - 1];
}

interface TextRevealProps {
  children: string;
  className?: string;
  delay?: number;
  /** Use "mount" for above-the-fold content (triggers immediately). */
  trigger?: "view" | "mount";
  /** Show a blinking cursor. Defaults to true. */
  cursor?: boolean;
  /** Absolute time (seconds) when cursor should disappear.
   *  Useful to hand off the cursor to the next TextReveal.
   *  Defaults to end-of-streaming + CURSOR_LINGER. */
  cursorUntil?: number;
  /** When false, defers animation start until set to true. Defaults to true. */
  active?: boolean;
  /** Called with each non-space character's element as it appears (needs the cursor). */
  onType?: (charEl: HTMLElement) => void;
}

/** Individual character — memoized so it never re-renders after mount. */
const Char = memo(function Char({
  char,
  shouldAnimate,
  delay,
  reducedMotion,
}: {
  char: string;
  shouldAnimate: boolean;
  delay: number;
  reducedMotion: boolean;
}) {
  if (reducedMotion) {
    return <span>{char}</span>;
  }
  return (
    <motion.span
      initial={{ opacity: 0 }}
      {...(shouldAnimate ? { animate: { opacity: 1 } } : {})}
      transition={{ duration: 0.03, delay }}
    >
      {char}
    </motion.span>
  );
});

export function TextReveal({
  children,
  className,
  delay = 0,
  trigger = "mount",
  cursor = true,
  cursorUntil,
  active = true,
  onType,
}: TextRevealProps) {
  const chars = useMemo(() => children.split(""), [children]);
  const seed = useMemo(() => seedFor(children), [children]);
  const { timings, totalTime } = useMemo(
    () => buildCharTimings(chars, delay, seed),
    [chars, delay, seed],
  );

  const rawHideTime = cursorUntil ?? delay + totalTime + CURSOR_LINGER;
  const cursorHideTime = cursorUntil != null
    ? rawHideTime
    : Math.ceil(rawHideTime / BLINK_CYCLE) * BLINK_CYCLE;

  const ref = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  // Read through a ref so a new callback identity does not restart the cursor loop
  const onTypeRef = useRef(onType);
  useEffect(() => {
    onTypeRef.current = onType;
  });
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = usePrefersReducedMotion();
  const shouldAnimate = (trigger === "mount" || isInView) && active && !prefersReducedMotion;

  // Cursor follows the last visible character by polling actual opacity
  useEffect(() => {
    if (!shouldAnimate || !cursor) return;

    const cursorEl = cursorRef.current;
    if (!cursorEl) return;

    const mountTime = performance.now();
    let prevIdx = -1;
    let rafId: number;

    const tick = () => {
      const elapsed = (performance.now() - mountTime) / 1000;

      if (elapsed >= cursorHideTime) {
        cursorEl.style.display = "none";
        return;
      }

      // Characters reveal strictly in order, so scan forward from the last
      // visible one instead of reading every character's style each frame.
      let lastVisible = prevIdx;
      for (let i = prevIdx + 1; i < charRefs.current.length; i++) {
        const span = charRefs.current[i]?.firstElementChild as HTMLElement | null;
        if (!span || parseFloat(getComputedStyle(span).opacity) <= 0.5) break;
        lastVisible = i;
      }

      if (lastVisible >= 0 && lastVisible !== prevIdx) {
        for (let i = prevIdx + 1; i <= lastVisible; i++) {
          const charEl = charRefs.current[i];
          if (charEl && chars[i].trim()) onTypeRef.current?.(charEl);
        }
        prevIdx = lastVisible;
        const charEl = charRefs.current[lastVisible];
        if (charEl) {
          charEl.appendChild(cursorEl);
          cursorEl.style.display = "";
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, cursor, cursorHideTime, chars]);

  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the text once; the per-character spans are presentational.
          The trailing space keeps consecutive TextReveal lines from running together. */}
      <span className="sr-only">{children} </span>
      <span aria-hidden="true">
        {chars.map((char, i) => (
          <span
            key={i}
            className="relative"
            ref={(el) => { charRefs.current[i] = el; }}
          >
            <Char
              char={char}
              shouldAnimate={shouldAnimate}
              delay={timings[i]}
              reducedMotion={prefersReducedMotion}
            />
          </span>
        ))}
        {/* Single cursor element, moved via DOM so it never triggers re-renders */}
        {cursor && !prefersReducedMotion && (
          <span
            ref={cursorRef}
            className="absolute w-[0.3em] bg-current"
            style={{
              left: "100%",
              top: "0.1em",
              bottom: "0.1em",
              animation: "cursor-blink 1s step-end infinite",
              display: "none",
            }}
          />
        )}
      </span>
    </span>
  );
}
