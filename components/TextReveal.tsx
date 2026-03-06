"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { memo, useEffect, useRef } from "react";

const CHAR_DELAY = 0.04; // seconds between each character
const CURSOR_LINGER = 5; // how long cursor stays after last char
const BLINK_CYCLE = 1; // matches cursor-blink animation duration

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
      transition={{ duration: 0.15, delay }}
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
  const totalStreamTime = chars.length * CHAR_DELAY;
  const rawHideTime = cursorUntil ?? delay + totalStreamTime + CURSOR_LINGER;
  const cursorHideTime = cursorUntil != null
    ? rawHideTime
    : Math.ceil(rawHideTime / BLINK_CYCLE) * BLINK_CYCLE;

  const ref = useRef<HTMLSpanElement>(null);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = (trigger === "mount" || isInView) && active && !prefersReducedMotion;

  // Direct DOM manipulation for cursor — no state, no re-renders
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

      if (elapsed < delay) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const idx = Math.min(
        Math.floor((elapsed - delay) / CHAR_DELAY),
        chars.length - 1,
      );

      // Only touch the DOM when the index actually changes
      if (idx !== prevIdx) {
        prevIdx = idx;
        const charEl = charRefs.current[idx];
        if (charEl) {
          // Re-parent cursor into the active character span
          charEl.appendChild(cursorEl);
          cursorEl.style.display = "";
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, cursor, delay, chars.length, cursorHideTime]);

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
            delay={delay + i * CHAR_DELAY}
            reducedMotion={!!prefersReducedMotion}
          />
        </span>
      ))}
      {/* Single cursor element — moved via DOM, never triggers re-renders */}
      {cursor && !prefersReducedMotion && (
        <span
          ref={cursorRef}
          className="absolute w-[0.07em] bg-current"
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
