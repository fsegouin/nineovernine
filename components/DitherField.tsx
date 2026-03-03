"use client";

import { useEffect, useRef } from "react";

// --- Perlin noise (classic 2D) ---

const PERM = new Uint8Array(512);
const GRAD = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function initNoise() {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let seed = 42;
  for (let i = 255; i > 0; i--) {
    seed = (seed * 16807 + 0) % 2147483647;
    const j = seed % (i + 1);
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) PERM[i] = p[i & 255];
}

function fade(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function noise2d(x: number, y: number): number {
  const xi = Math.floor(x) & 255;
  const yi = Math.floor(y) & 255;
  const xf = x - Math.floor(x);
  const yf = y - Math.floor(y);
  const u = fade(xf);
  const v = fade(yf);

  const aa = PERM[PERM[xi] + yi] % 8;
  const ab = PERM[PERM[xi] + yi + 1] % 8;
  const ba = PERM[PERM[xi + 1] + yi] % 8;
  const bb = PERM[PERM[xi + 1] + yi + 1] % 8;

  const g = GRAD;
  const x1 = xf - 1;
  const y1 = yf - 1;

  return (
    (g[aa][0] * xf + g[aa][1] * yf) * (1 - u) * (1 - v) +
    (g[ba][0] * x1 + g[ba][1] * yf) * u * (1 - v) +
    (g[ab][0] * xf + g[ab][1] * y1) * (1 - u) * v +
    (g[bb][0] * x1 + g[bb][1] * y1) * u * v
  );
}

// 2-octave fbm — lighter than 3-octave, still organic enough
function fbm2(x: number, y: number): number {
  return noise2d(x, y) * 0.667 + noise2d(x * 2, y * 2) * 0.333;
}

// --- Config ---

const CELL_SIZE = 8;
const BASE_OPACITY = 0.12;
const CURSOR_RADIUS_MIN = 120;
const CURSOR_RADIUS_MAX = 350;
const CURSOR_BOOST = 0.4;
const GLOW_DECAY = 0.0015;
const SPREAD_GROW = 0.15;
const SPREAD_SHRINK = 0.8;
const MOVE_THRESHOLD = 1.5;
const NOISE_SCALE = 0.02;
const NOISE_TIME_SCALE = 0.001;
const SCATTER_RADIUS = 250;
const SCATTER_BOOST = 0.35;
const ENERGY_GROW = 0.004;
const ENERGY_DECAY = 0.003;

// Squared radii to avoid sqrt in hot loop
const SCATTER_RADIUS_SQ = SCATTER_RADIUS * SCATTER_RADIUS;

// --- Helpers ---

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

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Dot {
  px: number;
  py: number;
  nx: number; // pre-computed noise coords
  ny: number;
  size: number;
  glow: number;
}

function createDots(width: number, height: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.ceil(width / CELL_SIZE) + 1;
  const rows = Math.ceil(height / CELL_SIZE) + 1;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const rng = mulberry32(col * 7919 + row * 104729 + 31337);
      const size = 0.5 + rng() * 1.8;
      const px = col * CELL_SIZE + CELL_SIZE * 0.5;
      const py = row * CELL_SIZE + CELL_SIZE * 0.5;

      dots.push({
        px,
        py,
        nx: px * NOISE_SCALE,
        ny: py * NOISE_SCALE,
        size,
        glow: 0,
      });
    }
  }

  return dots;
}

export function DitherField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dotsRef = useRef<Dot[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const smoothMouseRef = useRef({ x: -9999, y: -9999 });
  const prevMouseRef = useRef({ x: -9999, y: -9999 });
  const colorRef = useRef({ r: 250, g: 250, b: 250 });
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const spreadRef = useRef(CURSOR_RADIUS_MIN);
  const energyRef = useRef(0);
  const visibleRef = useRef(true);
  const dimsRef = useRef({ w: 0, h: 0 });
  const scrollingRef = useRef(false);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const frameSkipRef = useRef(0);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const container = canvas.parentElement;
    if (!container) return;

    initNoise();

    const updateColor = () => {
      const hex = getForegroundColor();
      colorRef.current = hexToRgb(hex);
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dimsRef.current.w = rect.width;
      dimsRef.current.h = rect.height;
      dotsRef.current = createDots(rect.width, rect.height);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const onScroll = () => {
      scrollingRef.current = true;
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        scrollingRef.current = false;
      }, 150);
    };

    // Pause animation when hero is off-screen
    const intersectionObs = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visibleRef.current;
        visibleRef.current = entry.isIntersecting;
        // Resume loop if becoming visible again
        if (!wasVisible && entry.isIntersecting) {
          lastTimeRef.current = 0;
          rafRef.current = requestAnimationFrame(animate);
        }
      },
      { threshold: 0 },
    );
    intersectionObs.observe(container);

    const animate = (time: number) => {
      if (!visibleRef.current) return;

      // While scrolling, only render every 3rd frame
      if (scrollingRef.current) {
        frameSkipRef.current++;
        if (frameSkipRef.current % 3 !== 0) {
          rafRef.current = requestAnimationFrame(animate);
          return;
        }
      }

      const dt = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      const { w: cw, h: ch } = dimsRef.current;
      ctx.clearRect(0, 0, cw, ch);

      const { r, g, b } = colorRef.current;
      const dots = dotsRef.current;

      // Smooth cursor
      const lerpFactor = 1 - Math.exp(-0.006 * dt);
      const sm = smoothMouseRef.current;
      const rm = mouseRef.current;
      if (sm.x < -9000) {
        sm.x = rm.x;
        sm.y = rm.y;
      } else {
        sm.x += (rm.x - sm.x) * lerpFactor;
        sm.y += (rm.y - sm.y) * lerpFactor;
      }
      const mx = sm.x;
      const my = sm.y;

      // Cursor movement detection
      const mdx = mx - prevMouseRef.current.x;
      const mdy = my - prevMouseRef.current.y;
      const cursorSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
      const moved = cursorSpeed > MOVE_THRESHOLD;
      prevMouseRef.current.x = mx;
      prevMouseRef.current.y = my;

      // Spread radius
      if (!moved && mx > 0 && my > 0) {
        spreadRef.current = Math.min(
          CURSOR_RADIUS_MAX,
          spreadRef.current + SPREAD_GROW * dt,
        );
      } else {
        spreadRef.current = Math.max(
          CURSOR_RADIUS_MIN,
          spreadRef.current - SPREAD_SHRINK * dt,
        );
      }
      const cursorRadius = spreadRef.current;
      const cursorRadiusSq = cursorRadius * cursorRadius;

      // Movement energy
      if (moved) {
        const speedFactor = Math.min(1, cursorSpeed / 15);
        energyRef.current = Math.min(
          1,
          energyRef.current + ENERGY_GROW * dt * speedFactor,
        );
      } else {
        energyRef.current = Math.max(
          0,
          energyRef.current - ENERGY_DECAY * dt,
        );
      }
      const energy = energyRef.current;
      const hasEnergy = energy > 0.01;

      const nt = time * NOISE_TIME_SCALE;
      const maxInteractRadius = Math.max(cursorRadius, hasEnergy ? SCATTER_RADIUS : 0);
      const maxInteractRadiusSq = maxInteractRadius * maxInteractRadius;

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const px = dot.px;
        const py = dot.py;
        const nx = dot.nx;
        const ny = dot.ny;

        // Base visibility — 2-octave fbm + one fast flicker layer
        const n1 = fbm2(nx + nt, ny + nt * 0.6);
        const n2 = noise2d(nx * 2.5 + nt * 3, ny * 2.5 - nt * 2);
        const noiseVal = ((n1 * 0.55 + n2 * 0.45) + 1) * 0.5;

        const baseAlpha =
          noiseVal > 0.35
            ? BASE_OPACITY * Math.min(1, (noiseVal - 0.35) * 3)
            : 0;

        // Squared distance to cursor — avoid sqrt unless needed
        const dx = px - mx;
        const dy = py - my;
        const distSq = dx * dx + dy * dy;

        // Early exit: if dot has no base visibility, no glow, and is far from cursor
        if (baseAlpha < 0.003 && dot.glow <= 0 && distSq > maxInteractRadiusSq) {
          continue;
        }

        // Flashlight glow
        if (distSq < cursorRadiusSq) {
          const dist = Math.sqrt(distSq);
          const proximity = 1 - dist / cursorRadius;
          const target = CURSOR_BOOST * proximity * proximity;
          if (target > dot.glow) {
            dot.glow = target;
          }
        }

        // Decay glow
        if (dot.glow > 0) {
          dot.glow = Math.max(0, dot.glow - GLOW_DECAY * dt);
        }

        // Scatter
        let scatterAlpha = 0;
        if (hasEnergy && distSq < SCATTER_RADIUS_SQ) {
          const scatterNoise = noise2d(nx * 3.7 + nt * 5, ny * 3.7 - nt * 4);
          const threshold = 1 - energy * 0.9;
          if ((scatterNoise + 1) * 0.5 > threshold) {
            const dist = Math.sqrt(distSq);
            scatterAlpha = SCATTER_BOOST * (1 - dist / SCATTER_RADIUS) * energy;
          }
        }

        const alpha = Math.min(0.6, baseAlpha + dot.glow + scatterAlpha);
        if (alpha < 0.003) continue;

        // Size variation + jitter — reuse one noise call for both
        const sn = noise2d(nx * 1.3 + 100 + nt * 2, ny * 1.3 + 200 - nt * 1.4);
        const full = Math.max(2, Math.round(dot.size * (0.5 + (sn + 1) * 0.4)) * 2);
        const half = full * 0.5;
        const jx = sn * 1.2; // derive jitter from same noise
        const jy = noise2d(nx * 2.1 + 80, ny * 2.1 + 50 - nt * 2.5) * 1.2;

        ctx.globalAlpha = alpha;
        ctx.fillRect(px - half + jx, py - half + jy, full, full);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    const themeObs = new MutationObserver(updateColor);
    themeObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let resizeTimer: ReturnType<typeof setTimeout>;
    const debouncedResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    };

    updateColor();
    resize();
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("resize", debouncedResize);
    window.addEventListener("scroll", onScroll, { passive: true });
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", debouncedResize);
      window.removeEventListener("scroll", onScroll);
      clearTimeout(resizeTimer);
      clearTimeout(scrollTimerRef.current);
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
