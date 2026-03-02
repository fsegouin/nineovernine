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
}

export function TextReveal({
  children,
  className,
  delay = 0,
  trigger = "mount",
}: TextRevealProps) {
  const chars = children.split("");
  const totalStreamTime = chars.length * CHAR_DELAY;

  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const shouldAnimate = trigger === "mount" || isInView;

  const [showCursor, setShowCursor] = useState(false);

  useEffect(() => {
    if (!shouldAnimate) return;

    const showTimer = setTimeout(
      () => setShowCursor(true),
      delay * 1000
    );
    const hideTimer = setTimeout(
      () => setShowCursor(false),
      (delay + totalStreamTime + CURSOR_LINGER) * 1000
    );

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [shouldAnimate, delay, totalStreamTime]);

  return (
    <span ref={ref} className={className}>
      {chars.map((char, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0 }}
          {...(shouldAnimate ? { animate: { opacity: 1 } } : {})}
          transition={{
            duration: 0.02,
            delay: delay + i * CHAR_DELAY,
          }}
        >
          {char}
        </motion.span>
      ))}
      {showCursor && (
        <span
          className="inline-block w-[0.06em] bg-current align-baseline"
          style={{
            height: "0.85em",
            marginLeft: "1px",
            animation: "cursor-blink 0.53s step-end infinite",
          }}
        />
      )}
    </span>
  );
}
