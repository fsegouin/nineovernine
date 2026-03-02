"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";

export function Cursor() {
  const [visible, setVisible] = useState(false);
  const hasMoved = useRef(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const scale = useMotionValue(1);

  const pathname = usePathname();

  const springX = useSpring(mouseX, { damping: 25, stiffness: 250, mass: 0.5 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 250, mass: 0.5 });
  const springScale = useSpring(scale, { damping: 20, stiffness: 300 });

  // Reset cursor scale on route change
  useEffect(() => {
    scale.set(1);
  }, [pathname, scale]);

  useEffect(() => {
    // Only show on devices with a precise pointer (mouse)
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const move = (e: MouseEvent) => {
      if (!hasMoved.current) {
        // Jump to initial position instantly (no spring from 0,0)
        hasMoved.current = true;
        springX.jump(e.clientX);
        springY.jump(e.clientY);
        setVisible(true);
      }
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };

    const over = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("a, button, [data-cursor]")) {
        scale.set(5);
      }
    };

    const out = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null;
      if (!target?.closest("a, button, [data-cursor]")) {
        scale.set(1);
      }
    };

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseover", over);
    document.addEventListener("mouseout", out);

    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", over);
      document.removeEventListener("mouseout", out);
    };
  }, [mouseX, mouseY, scale]);

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[99] h-3 w-3 -ml-1.5 -mt-1.5 rounded-full bg-white mix-blend-difference"
      style={{ x: springX, y: springY, scale: springScale }}
    />
  );
}
