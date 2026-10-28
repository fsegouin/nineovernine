"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring } from "motion/react";

const TRAIL_COUNT = 6;
const VELOCITY_THRESHOLD = 30;
const REST_SCALE = 0.2;

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
  // The dot is drawn at its hover size and scaled down at rest: the browser
  // rasterises the layer at its CSS size, so scaling up from 12px would blur it.
  const scale = useMotionValue(REST_SCALE);

  const pathname = usePathname();

  const springX = useSpring(mouseX, { damping: 25, stiffness: 250, mass: 0.5 });
  const springY = useSpring(mouseY, { damping: 25, stiffness: 250, mass: 0.5 });
  const springScale = useSpring(scale, { damping: 20, stiffness: 300 });

  const trailRef = useRef<TrailDot[]>([]);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const rafId = useRef(0);

  useEffect(() => {
    scale.set(REST_SCALE);
  }, [pathname, scale]);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    // Forced colours can drop the white dot and its blend mode, leaving no pointer at all
    if (window.matchMedia("(forced-colors: active)").matches) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // globals.css hides the native cursor only while this class is set
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");

    // Created on demand: a permanent full-viewport canvas would cost compositing on every frame
    function ensureTrailCanvas() {
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
    }

    function removeTrailCanvas() {
      trailCanvasRef.current?.remove();
      trailCanvasRef.current = null;
    }

    function renderTrail() {
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
    }

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

      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      const velocity = Math.sqrt(dx * dx + dy * dy);
      lastPos.current = { x: e.clientX, y: e.clientY };

      if (velocity > VELOCITY_THRESHOLD && !reduceMotion) {
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
        scale.set(1);
      }
    };

    const out = (e: MouseEvent) => {
      const target = e.relatedTarget as HTMLElement | null;
      if (!target?.closest("a, button, [data-cursor]")) {
        scale.set(REST_SCALE);
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
      // Reset so a remount (StrictMode, layout remount) can start the trail again
      rafId.current = 0;
      trailRef.current = [];
      removeTrailCanvas();
      root.classList.remove("has-custom-cursor");
    };
  }, [mouseX, mouseY, scale, springX, springY]);

  if (!visible) return null;

  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-[99] h-15 w-15 -ml-7.5 -mt-7.5 rounded-full bg-white mix-blend-difference"
      style={{ x: springX, y: springY, scale: springScale }}
    />
  );
}
