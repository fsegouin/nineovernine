"use client";

import { memo, useEffect, useRef } from "react";
import { getThemeClass } from "@/lib/theme-class";

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

const PULSE_EVENT = "dither:pulse";

/** Pulses the hero dither field at an element's right edge, where a typed character lands. */
export function pulseDitherAt(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  window.dispatchEvent(
    new CustomEvent(PULSE_EVENT, { detail: { x: rect.right, y: rect.top + rect.height / 2 } }),
  );
}

export const DitherField = memo(function DitherField() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a fresh canvas each mount — transferControlToOffscreen
    // can only be called once per canvas element, and React may reuse
    // DOM nodes across client-side navigations.
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.className = "pointer-events-none absolute inset-0 h-full w-full";
    canvas.style.willChange = "transform"; // promote to compositor layer
    container.appendChild(canvas);

    // OffscreenCanvas required for worker rendering
    if (typeof canvas.transferControlToOffscreen !== "function") {
      container.removeChild(canvas);
      return;
    }

    const offscreen = canvas.transferControlToOffscreen();
    const worker = new Worker(
      new URL("./dither-worker.ts", import.meta.url),
    );

    const isPointerFine = window.matchMedia("(pointer: fine)").matches;
    const reducedMotionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
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
        reducedMotion: reducedMotionMq.matches,
        color: hexToRgb(getForegroundColor()),
      },
      [offscreen],
    );

    // Cache bounding rect to avoid layout thrashing on every mouse/touch event.
    // Updated on resize and scroll.
    let cachedRect = rect;

    // Throttle mousemove to one message per animation frame
    let pendingMouse: { x: number; y: number } | null = null;
    let mouseRafId = 0;
    const onMouseMove = (e: MouseEvent) => {
      pendingMouse = {
        x: e.clientX - cachedRect.left,
        y: e.clientY - cachedRect.top,
      };
      if (!mouseRafId) {
        mouseRafId = requestAnimationFrame(() => {
          if (pendingMouse) {
            worker.postMessage({ type: "mouse", ...pendingMouse });
            pendingMouse = null;
          }
          mouseRafId = 0;
        });
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      worker.postMessage({
        type: "touchstart",
        x: touch.clientX - cachedRect.left,
        y: touch.clientY - cachedRect.top,
      });
    };

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      worker.postMessage({
        type: "touchmove",
        x: touch.clientX - cachedRect.left,
        y: touch.clientY - cachedRect.top,
      });
    };

    const onTouchEnd = () => {
      worker.postMessage({ type: "touchend" });
    };

    // The hero moves with the page, so re-measure it once per frame while scrolling
    let scrollRafId = 0;
    const onScroll = () => {
      if (!scrollRafId) {
        scrollRafId = requestAnimationFrame(() => {
          cachedRect = container.getBoundingClientRect();
          scrollRafId = 0;
        });
      }
    };

    // Pause while the hero is off-screen or the tab is hidden
    let onScreen = true;
    const postVisibility = () => {
      worker.postMessage({ type: "visibility", visible: onScreen && !document.hidden });
    };
    const intersectionObs = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        postVisibility();
      },
      { threshold: 0 },
    );
    intersectionObs.observe(container);

    // Any script on the page can dispatch this event, so drop a detail that is not two finite numbers
    const onPulse = (e: Event) => {
      const detail = (e as CustomEvent<{ x?: unknown; y?: unknown } | null>).detail;
      const x = detail?.x;
      const y = detail?.y;
      if (typeof x !== "number" || typeof y !== "number" || !Number.isFinite(x) || !Number.isFinite(y)) return;
      worker.postMessage({ type: "pulse", x: x - cachedRect.left, y: y - cachedRect.top });
    };

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cachedRect = container.getBoundingClientRect();
        worker.postMessage({
          type: "resize",
          width: cachedRect.width,
          height: cachedRect.height,
          dpr: window.devicePixelRatio || 1,
        });
      }, 150);
    };

    const postTheme = () => {
      worker.postMessage({
        type: "theme",
        color: hexToRgb(getForegroundColor()),
      });
    };
    // Lenis toggles classes on <html> while scrolling, so react to the theme class only
    let prevTheme = getThemeClass();
    const themeObs = new MutationObserver(() => {
      const theme = getThemeClass();
      if (theme === prevTheme) return;
      prevTheme = theme;
      postTheme();
    });
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    // Without a stored theme the foreground follows the OS preference
    const colorSchemeMq = window.matchMedia("(prefers-color-scheme: dark)");
    colorSchemeMq.addEventListener("change", postTheme);
    const onReducedMotion = () => {
      worker.postMessage({ type: "reducedMotion", value: reducedMotionMq.matches });
    };
    reducedMotionMq.addEventListener("change", onReducedMotion);

    const onClick = (e: MouseEvent) => {
      worker.postMessage({
        type: "click",
        x: e.clientX - cachedRect.left,
        y: e.clientY - cachedRect.top,
      });
    };

    if (isPointerFine) {
      window.addEventListener("mousemove", onMouseMove);
      container.addEventListener("click", onClick);
    }
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(PULSE_EVENT, onPulse);
    document.addEventListener("visibilitychange", postVisibility);

    return () => {
      worker.postMessage({ type: "destroy" });
      worker.terminate();
      window.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("click", onClick);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(PULSE_EVENT, onPulse);
      document.removeEventListener("visibilitychange", postVisibility);
      if (scrollRafId) cancelAnimationFrame(scrollRafId);
      if (mouseRafId) cancelAnimationFrame(mouseRafId);
      clearTimeout(resizeTimer);
      themeObs.disconnect();
      colorSchemeMq.removeEventListener("change", postTheme);
      reducedMotionMq.removeEventListener("change", onReducedMotion);
      intersectionObs.disconnect();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0"
    />
  );
});
