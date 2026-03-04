"use client";

import { useEffect, useRef } from "react";

function getForegroundColor(): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue("--foreground")
    .trim();
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { r: 250, g: 250, b: 250 };
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function DitherField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    // OffscreenCanvas required for worker rendering
    if (typeof canvas.transferControlToOffscreen !== "function") return;

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(
      new URL("./dither-worker.ts", import.meta.url),
    );
    workerRef.current = worker;

    const isPointerFine = window.matchMedia("(pointer: fine)").matches;
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    // Initialize worker with canvas + initial state
    worker.postMessage(
      {
        type: "init",
        canvas: offscreen,
        width: rect.width,
        height: rect.height,
        dpr,
        isPointerFine,
        color: hexToRgb(getForegroundColor()),
      },
      [offscreen],
    );

    // --- Forward events to worker ---

    const onMouseMove = (e: MouseEvent) => {
      const r = container.getBoundingClientRect();
      worker.postMessage({
        type: "mouse",
        x: e.clientX - r.left,
        y: e.clientY - r.top,
      });
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const r = container.getBoundingClientRect();
      worker.postMessage({
        type: "touchstart",
        x: touch.clientX - r.left,
        y: touch.clientY - r.top,
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const r = container.getBoundingClientRect();
      worker.postMessage({
        type: "touchmove",
        x: touch.clientX - r.left,
        y: touch.clientY - r.top,
      });
    };

    const onTouchEnd = () => {
      worker.postMessage({ type: "touchend" });
    };

    // Pause when hero is off-screen
    const intersectionObs = new IntersectionObserver(
      ([entry]) => {
        worker.postMessage({
          type: "visibility",
          visible: entry.isIntersecting,
        });
      },
      { threshold: 0 },
    );
    intersectionObs.observe(container);

    // Resize
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const r = container.getBoundingClientRect();
        worker.postMessage({
          type: "resize",
          width: r.width,
          height: r.height,
          dpr: window.devicePixelRatio || 1,
        });
      }, 150);
    };

    // Theme changes
    const themeObs = new MutationObserver(() => {
      worker.postMessage({
        type: "theme",
        color: hexToRgb(getForegroundColor()),
      });
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Attach listeners
    if (isPointerFine) {
      window.addEventListener("mousemove", onMouseMove);
    }
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchmove", onTouchMove, { passive: true });
    container.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", onResize);

    return () => {
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      workerRef.current = null;
      window.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      clearTimeout(resizeTimer);
      themeObs.disconnect();
      intersectionObs.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0"
    />
  );
}
