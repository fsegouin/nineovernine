"use client";

import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

const CHAR_DELAY = 0.03; // seconds between each character
const CURSOR_LINGER = 0.8; // how long cursor stays after last char

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
  const cursorHideTime = cursorUntil ?? delay + totalStreamTime + CURSOR_LINGER;

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
              className="absolute bottom-0 w-[0.07em] bg-current"
              style={{
                left: "100%",
                height: "0.75em",
                animation: "cursor-blink 0.53s step-end infinite",
              }}
            />
          )}
        </span>
      ))}
    </span>
  );
}
