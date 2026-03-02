"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

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
}

export function TextReveal({
  children,
  className,
  delay = 0,
  trigger = "mount",
  cursor = true,
  cursorUntil,
}: TextRevealProps) {
  const chars = children.split("");
  const totalStreamTime = chars.length * CHAR_DELAY;
  const rawHideTime = cursorUntil ?? delay + totalStreamTime + CURSOR_LINGER;
  // Round up to the next full blink cycle so the cursor never vanishes mid-blink
  const cursorHideTime = Math.ceil(rawHideTime / BLINK_CYCLE) * BLINK_CYCLE;

  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldAnimate = trigger === "mount" || isInView;

  // -1 = hidden, 0..n = cursor sits after character at that index
  const [cursorPos, setCursorPos] = useState(-1);

  useEffect(() => {
    if (!shouldAnimate || !cursor) return;

    const mountTime = performance.now();
    let rafId: number;

    const tick = () => {
      const elapsed = (performance.now() - mountTime) / 1000;

      if (elapsed >= cursorHideTime) {
        setCursorPos(-1);
        return;
      }

      if (elapsed < delay) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const idx = Math.min(
        Math.floor((elapsed - delay) / CHAR_DELAY),
        chars.length - 1
      );
      setCursorPos(idx);
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [shouldAnimate, cursor, delay, chars.length, cursorHideTime]);

  return (
    <span ref={ref} className={className}>
      {chars.map((char, i) => (
        <span key={i} className="relative">
          <motion.span
            initial={{ opacity: 0 }}
            {...(shouldAnimate ? { animate: { opacity: 1 } } : {})}
            transition={{
              duration: 0.15,
              delay: delay + i * CHAR_DELAY,
            }}
          >
            {char}
          </motion.span>
          {cursorPos === i && (
            <span
              className="absolute w-[0.07em] bg-current"
              style={{
                left: "100%",
                top: "0.1em",
                bottom: "0.1em",
                animation: "cursor-blink 1s step-end infinite",
              }}
            />
          )}
        </span>
      ))}
    </span>
  );
}
