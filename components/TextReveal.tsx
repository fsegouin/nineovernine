"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useEffect, useMemo, useRef } from "react";

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

/** Estimate the time the last character appears (for chaining delays). */
export function estimateStreamDuration(text: string) {
  return (text.length - 1) * CHAR_DELAY;
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
}: TextRevealProps) {
  const chars = children.split("");

  // Stable seed from the text content so timings don't shift on re-render
  const seed = useMemo(
    () => children.split("").reduce((acc, c, i) => acc + c.charCodeAt(0) * (i + 1), 7),
    [children],
  );
  const { timings, totalTime } = useMemo(
    () => buildCharTimings(chars, delay, seed),
    [chars.length, delay, seed],
  );

  const rawHideTime = cursorUntil ?? delay + totalTime + CURSOR_LINGER;
  const cursorHideTime = cursorUntil != null
    ? rawHideTime
    : Math.ceil(rawHideTime / BLINK_CYCLE) * BLINK_CYCLE;

  const ref = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();
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

      // Find the last character that's actually visible
      let lastVisible = -1;
      for (let i = charRefs.current.length - 1; i >= 0; i--) {
        const span = charRefs.current[i]?.firstElementChild as HTMLElement | null;
        if (span && parseFloat(getComputedStyle(span).opacity) > 0.5) {
          lastVisible = i;
          break;
        }
      }

      if (lastVisible >= 0 && lastVisible !== prevIdx) {
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
  }, [shouldAnimate, cursor, cursorHideTime]);

  return (
    <span ref={ref} className={className}>
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
            reducedMotion={!!prefersReducedMotion}
          />
        </span>
      ))}
      {/* Single cursor element — moved via DOM, never triggers re-renders */}
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
  );
}
