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

function lerp(a: number, b: number, t: number) {
  return a + t * (b - a);
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

  const dot = (g: number[], fx: number, fy: number) => g[0] * fx + g[1] * fy;

  return lerp(
    lerp(dot(GRAD[aa], xf, yf), dot(GRAD[ba], xf - 1, yf), u),
    lerp(dot(GRAD[ab], xf, yf - 1), dot(GRAD[bb], xf - 1, yf - 1), u),
    v,
  );
}

function fbm(x: number, y: number, octaves: number = 4): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;
  for (let i = 0; i < octaves; i++) {
    value += noise2d(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= 0.5;
    frequency *= 2;
  }
  return value / max;
}

// --- Config ---

const CELL_SIZE = 8;
const BASE_OPACITY = 0.12;
const CURSOR_RADIUS_MIN = 120; // base flashlight radius
const CURSOR_RADIUS_MAX = 350; // max spread when dwelling
const CURSOR_BOOST = 0.4;
const GLOW_DECAY = 0.0015; // how fast the flashlight trail fades (per ms)
const SPREAD_GROW = 0.15; // how fast radius grows per ms when stationary
const SPREAD_SHRINK = 0.8; // how fast radius shrinks per ms when moving
const MOVE_THRESHOLD = 1.5; // px movement to count as "moving"
const NOISE_SCALE = 0.02;
const NOISE_TIME_SCALE = 0.001;
const SCATTER_RADIUS = 250; // how far scatter pixels spread from cursor
const SCATTER_BOOST = 0.35; // max opacity of scatter pixels
const ENERGY_GROW = 0.004; // how fast movement energy builds (per ms, scaled by speed)
const ENERGY_DECAY = 0.003; // how fast energy fades when cursor stops (per ms)

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
  px: number; // fixed pixel position (grid-snapped)
  py: number;
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

      // Exact grid center, no jitter
      const px = col * CELL_SIZE + CELL_SIZE * 0.5;
      const py = row * CELL_SIZE + CELL_SIZE * 0.5;

      dots.push({ px, py, size, glow: 0 });
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
  const energyRef = useRef(0); // 0–1, how much "scatter" is active

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
      dotsRef.current = createDots(rect.width, rect.height);
    };

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = e.clientX - rect.left;
      mouseRef.current.y = e.clientY - rect.top;
    };

    const animate = (time: number) => {
      const dt = lastTimeRef.current ? time - lastTimeRef.current : 16;
      lastTimeRef.current = time;

      const cw = parseInt(canvas.style.width) || canvas.width;
      const ch = parseInt(canvas.style.height) || canvas.height;
      ctx.clearRect(0, 0, cw, ch);

      const { r, g, b } = colorRef.current;
      const dots = dotsRef.current;

      // Smooth cursor — lerp toward actual mouse position for lag
      const lerpFactor = 1 - Math.exp(-0.006 * dt);
      const sm = smoothMouseRef.current;
      const rm = mouseRef.current;
      // Snap on first real mouse position, lerp after that
      if (sm.x < -9000) {
        sm.x = rm.x;
        sm.y = rm.y;
      } else {
        sm.x += (rm.x - sm.x) * lerpFactor;
        sm.y += (rm.y - sm.y) * lerpFactor;
      }
      const mx = sm.x;
      const my = sm.y;

      // Detect if cursor is stationary — grow spread radius, else shrink
      const mdx = mx - prevMouseRef.current.x;
      const mdy = my - prevMouseRef.current.y;
      const cursorSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
      const moved = cursorSpeed > MOVE_THRESHOLD;
      prevMouseRef.current.x = mx;
      prevMouseRef.current.y = my;

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

      // Movement energy — builds while moving, decays when stopped
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

      const nt = time * NOISE_TIME_SCALE;

      ctx.fillStyle = `rgb(${r},${g},${b})`;

      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];

        const px = dot.px;
        const py = dot.py;

        // Noise-driven base visibility
        const nx = px * NOISE_SCALE;
        const ny = py * NOISE_SCALE;
        const n1 = fbm(nx + nt, ny + nt * 0.6, 3);
        const n2 = noise2d(nx * 2.5 + nt * 3, ny * 2.5 - nt * 2);
        const n3 = noise2d(nx * 0.8 - nt * 1.5, ny * 1.2 + nt * 1.8);
        const n = n1 * 0.4 + n2 * 0.35 + n3 * 0.25;
        const noiseVal = (n + 1) * 0.5;

        const baseAlpha =
          noiseVal > 0.35
            ? BASE_OPACITY * Math.min(1, (noiseVal - 0.35) * 3)
            : 0;

        // Flashlight — cursor proximity sets glow, radius spreads when dwelling
        const dx = px - mx;
        const dy = py - my;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < cursorRadius) {
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

        // Scatter — extra pixels appear around cursor while moving
        let scatterAlpha = 0;
        if (energy > 0.01 && dist < SCATTER_RADIUS) {
          // Use noise to randomly select which dots get scattered
          const scatterNoise = noise2d(
            nx * 3.7 + nt * 5,
            ny * 3.7 - nt * 4,
          );
          // Higher energy = lower threshold = more dots appear
          const threshold = 1 - energy * 0.9; // energy 1 → threshold 0.1
          if ((scatterNoise + 1) * 0.5 > threshold) {
            const distFade = 1 - dist / SCATTER_RADIUS;
            scatterAlpha = SCATTER_BOOST * distFade * energy;
          }
        }

        const alpha = Math.min(0.6, baseAlpha + dot.glow + scatterAlpha);
        if (alpha < 0.003) continue;

        // Per-dot size variation over time
        const sizeNoise = noise2d(nx * 1.3 + 100 + nt * 2, ny * 1.3 + 200 - nt * 1.4);
        const rawSize = dot.size * (0.5 + (sizeNoise + 1) * 0.4);
        const full = Math.max(2, Math.round(rawSize) * 2);
        const half = full * 0.5;

        // Tiny jitter tied to size noise — wobbles as it scales
        const jx = noise2d(nx * 2.1 + 50 + nt * 2.5, ny * 2.1 + 80) * 1.2;
        const jy = noise2d(nx * 2.1 + 80, ny * 2.1 + 50 - nt * 2.5) * 1.2;

        ctx.globalAlpha = alpha;
        ctx.fillRect(px - half + jx, py - half + jy, full, full);
      }

      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(animate);
    };

    const observer = new MutationObserver(updateColor);
    observer.observe(document.documentElement, {
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
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", debouncedResize);
      clearTimeout(resizeTimer);
      observer.disconnect();
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
