"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";

const TRAIL_COUNT = 6;
const VELOCITY_THRESHOLD = 30;

interface TrailDot {
  x: number;
  y: number;
  opacity: number;
}

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

  // Trail state — canvas created on demand, removed when trail fades
  const trailRef = useRef<TrailDot[]>([]);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  // Reset cursor scale on route change
  useEffect(() => {
    scale.set(1);
  }, [pathname, scale]);

  // Create trail canvas on demand (avoids permanent full-viewport compositing cost)
  const ensureTrailCanvas = useCallback(() => {
    if (trailCanvasRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText =
      "pointer-events:none;position:fixed;inset:0;z-index:98;mix-blend-mode:difference";
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    document.body.appendChild(canvas);
    trailCanvasRef.current = canvas;
  }, []);

  const removeTrailCanvas = useCallback(() => {
    const canvas = trailCanvasRef.current;
    if (canvas) {
      canvas.remove();
      trailCanvasRef.current = null;
    }
  }, []);

  const renderTrail = useCallback(() => {
    const canvas = trailCanvasRef.current;
    if (!canvas) { rafId.current = 0; return; }
    const ctx = canvas.getContext("2d");
    if (!ctx) { rafId.current = 0; return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = window.devicePixelRatio || 1;

    let hasVisible = false;
    for (let i = trailRef.current.length - 1; i >= 0; i--) {
      const dot = trailRef.current[i];
      dot.opacity -= 0.04;
      if (dot.opacity <= 0) {
        trailRef.current.splice(i, 1);
        continue;
      }
      hasVisible = true;
      const size = (dot.opacity * 5) * dpr;
      ctx.globalAlpha = dot.opacity;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(dot.x * dpr, dot.y * dpr, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hasVisible) {
      rafId.current = requestAnimationFrame(renderTrail);
    } else {
      rafId.current = 0;
      removeTrailCanvas();
    }
  }, [removeTrailCanvas]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      removeTrailCanvas();
    };
  }, [removeTrailCanvas]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const move = (e: MouseEvent) => {
      if (!hasMoved.current) {
        hasMoved.current = true;
        springX.jump(e.clientX);
        springY.jump(e.clientY);
        lastPos.current = { x: e.clientX, y: e.clientY };
        setVisible(true);
      }
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);

      // Velocity check for trail
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      lastPos.current = { x: e.clientX, y: e.clientY };

      if (velocity > VELOCITY_THRESHOLD) {
        ensureTrailCanvas();
        trailRef.current.push({ x: e.clientX, y: e.clientY, opacity: 0.6 });
        if (trailRef.current.length > TRAIL_COUNT * 3) {
          trailRef.current = trailRef.current.slice(-TRAIL_COUNT * 2);
        }
        if (!rafId.current) {
          rafId.current = requestAnimationFrame(renderTrail);
        }
      }
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
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [mouseX, mouseY, scale, renderTrail, ensureTrailCanvas]);

  if (!visible) return null;

  return (
    <motion.div
      className="pointer-events-none fixed left-0 top-0 z-[99] h-3 w-3 -ml-1.5 -mt-1.5 rounded-full bg-white mix-blend-difference"
      style={{ x: springX, y: springY, scale: springScale }}
    />
  );
}
