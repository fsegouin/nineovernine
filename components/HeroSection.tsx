"use client";

import { motion } from "motion/react";
import { TextReveal } from "./TextReveal";

export function HeroSection() {
  return (
    <section className="flex min-h-[90vh] items-end px-6 pb-24 pt-32 lg:px-12">
      <div className="mx-auto w-full max-w-7xl">
        <div className="grid grid-cols-12">
          <div className="col-span-12 lg:col-span-10">
            <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              <TextReveal delay={0.2} trigger="mount" cursorUntil={1.1}>Crafting digital</TextReveal>
              <br />
              <TextReveal delay={1.1} trigger="mount" cursorUntil={2.15}>experiences for the</TextReveal>
              <br />
              <TextReveal delay={2.15} trigger="mount">age of intelligence.</TextReveal>
            </h1>

            <motion.p
              className="mt-8 max-w-lg font-sans text-lg leading-relaxed text-muted md:text-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.7,
                delay: 3.8,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              A human-led digital agency where craft meets intelligence.
            </motion.p>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="mt-20 flex justify-start"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 4.2 }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="font-sans text-[10px] uppercase tracking-[0.2em] text-muted">
              Scroll
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
