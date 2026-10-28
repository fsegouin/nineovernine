"use client";

import { MotionConfig } from "motion/react";

/** Honours prefers-reduced-motion for every Motion animation: transforms and layout animations are skipped, opacity fades stay. */
export function MotionPreferences({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
