"use client";

import { motion } from "motion/react";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

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
  const words = children.split(" ");

  return (
    <span className={className}>
      {words.map((word, i) => (
        <span
          key={i}
          className={`inline-block overflow-hidden pb-[0.15em] pt-[0.05em]${
            i < words.length - 1 ? " mr-[0.25em]" : ""
          }`}
        >
          <motion.span
            className="inline-block"
            initial={{ y: "100%", opacity: 0 }}
            {...(trigger === "mount"
              ? { animate: { y: "0%", opacity: 1 } }
              : {
                  whileInView: { y: "0%", opacity: 1 },
                  viewport: { once: true, margin: "-80px" },
                })}
            transition={{
              y: { duration: 0.6, delay: delay + i * 0.04, ease: EASE },
              opacity: { duration: 0.15, delay: delay + i * 0.04 },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </span>
  );
}
