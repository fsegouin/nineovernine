"use client";

import Link from "next/link";
import { motion } from "motion/react";

export default function NinePage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6">
      <motion.span
        className="font-display text-[12rem] font-bold leading-none sm:text-[16rem]"
        animate={{ rotate: [0, 180, 360] }}
        transition={{ duration: 6, ease: "linear", repeat: Infinity }}
      >
        9
      </motion.span>
      <motion.p
        className="text-center font-sans text-sm tracking-wide text-muted"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 1.5 }}
      >
        Some things look different upside down.
      </motion.p>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 5, duration: 1 }}
      >
        <Link
          href="/"
          className="text-xs tracking-[0.2em] uppercase text-muted transition-colors hover:text-foreground"
        >
          Back
        </Link>
      </motion.div>
    </div>
  );
}
