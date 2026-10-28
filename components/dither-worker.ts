// DitherField Web Worker: the field renders off the main thread so scrolling stays
// smooth. It draws with WebGL2 (dither-gl.ts) and falls back to Canvas 2D, where
// this file computes every dot itself.

import {
  BASE_OPACITY,
  CELL_SIZE,
  CURSOR_BOOST,
  CURSOR_RADIUS_MAX,
  CURSOR_RADIUS_MIN,
  DISSIPATE_BOOST,
  DISSIPATE_DURATION,
  DISSIPATE_RING_WIDTH,
  DISSIPATE_SPEED,
  ENERGY_DECAY,
  ENERGY_GROW,
  GLOW_DECAY,
  IMPULSE_ENERGY,
  MAX_ALPHA,
  MIN_FRAME_MS,
  MOVE_THRESHOLD,
  NOISE_SCALE,
  NOISE_TIME_SCALE,
  PULSE_BOOST,
  PULSE_RADIUS,
  SCATTER_BOOST,
  SCATTER_RADIUS,
  SPREAD_GROW,
  SPREAD_SHRINK,
} from "./dither-config";
import { createGlRenderer, MAX_PULSES, type GlRenderer } from "./dither-gl";

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
  const xi0 = Math.floor(x);
  const yi0 = Math.floor(y);
  const xi = xi0 & 255;
  const yi = yi0 & 255;
  const xf = x - xi0;
  const yf = y - yi0;
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

function fbm2(x: number, y: number): number {
  return noise2d(x, y) * 0.667 + noise2d(x * 2, y * 2) * 0.333;
}

// --- Config ---

const SCATTER_RADIUS_SQ = SCATTER_RADIUS * SCATTER_RADIUS;
// The Canvas 2D fallback draws dots grouped by quantised opacity, so it changes
// globalAlpha once per level instead of once per dot. 48 levels step by about 0.0125.
const ALPHA_LEVELS = 48;
const MAX_DT_MS = 64;

// --- Helpers ---

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
  nx: number;
  ny: number;
  size: number;
  glow: number;
  baseAlpha: number;
  drawSize: number;
  jx: number;
  jy: number;
}

// Dots are laid out row by row, gridCols per row; pulses index into the grid with it
let gridCols = 0;

function createDots(width: number, height: number): Dot[] {
  const dots: Dot[] = [];
  const cols = Math.ceil(width / CELL_SIZE) + 1;
  gridCols = cols;
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
        baseAlpha: 0,
        drawSize: 2,
        jx: (rng() - 0.5) * 2.4,
        jy: (rng() - 0.5) * 2.4,
      });
    }
  }

  return dots;
}

// --- Worker state ---

let canvas: OffscreenCanvas;
let ctx: OffscreenCanvasRenderingContext2D;
// Set when WebGL2 is available; the Canvas 2D path below runs only without it
let gl: GlRenderer | null = null;
const pendingPulses: { x: number; y: number }[] = [];
// WebGL2 idles at about 30fps when nothing is interacting: the ambient drift is slow
const GL_IDLE_FRAME_MS = 33;
let lastGlDraw = 0;
// The brightest glow (PULSE_BOOST) takes about 330ms to decay, so keep drawing a little after interaction stops
const GLOW_SETTLE_MS = 400;
let glowSettlesAt = 0;
let dots: Dot[] = [];
let dpr = 1;
const dims = { w: 0, h: 0 };
let color = { r: 250, g: 250, b: 250 };
let isPointerFine = true;
// Reduced motion: draw the noise field once and keep it still; cursor interaction stays
let reducedMotion = false;

// Interaction state
const mouse = { x: -9999, y: -9999 };
const smoothMouse = { x: -9999, y: -9999 };
const prevMouse = { x: -9999, y: -9999 };
let spread = CURSOR_RADIUS_MIN;
let energy = 0;

// Dissipation state
const dissipation = { active: false, x: 0, y: 0, elapsed: 0, radius0: 0 };

// Animation state
let visible = true;
let lastTime = 0;
let lastFrameTime = 0;
let noiseFrame = 0;
let running = false;
let needsRender = true; // true when visual state has changed

// --- Animation loop ---

function animate(time: number) {
  if (!visible || !running) return;

  if (lastFrameTime && time - lastFrameTime < MIN_FRAME_MS) {
    scheduleFrame();
    return;
  }
  lastFrameTime = time;

  // Capped so a stalled frame (a busy GPU, a backgrounded tab) does not jump the simulation
  const dt = lastTime ? Math.min(time - lastTime, MAX_DT_MS) : 16;
  lastTime = time;

  const { w: cw, h: ch } = dims;

  const { r, g, b } = color;

  // Smooth cursor
  const lerpFactor = isPointerFine
    ? 1 - Math.exp(-0.006 * dt)
    : 1 - Math.exp(-0.02 * dt);
  if (smoothMouse.x < -9000) {
    smoothMouse.x = mouse.x;
    smoothMouse.y = mouse.y;
  } else {
    smoothMouse.x += (mouse.x - smoothMouse.x) * lerpFactor;
    smoothMouse.y += (mouse.y - smoothMouse.y) * lerpFactor;
  }
  const mx = smoothMouse.x;
  const my = smoothMouse.y;

  // Cursor movement detection
  const mdx = mx - prevMouse.x;
  const mdy = my - prevMouse.y;
  const cursorSpeed = Math.sqrt(mdx * mdx + mdy * mdy);
  const moved = cursorSpeed > MOVE_THRESHOLD;
  prevMouse.x = mx;
  prevMouse.y = my;

  // Spread radius
  const prevSpread = spread;
  if (!moved && mx > 0 && my > 0) {
    spread = Math.min(CURSOR_RADIUS_MAX, spread + SPREAD_GROW * dt);
  } else {
    spread = Math.max(CURSOR_RADIUS_MIN, spread - SPREAD_SHRINK * dt);
  }
  // The flashlight keeps easing toward the cursor and growing after the last mouse event
  const cursorSettling = spread !== prevSpread
    || Math.abs(mouse.x - mx) > 0.5 || Math.abs(mouse.y - my) > 0.5;
  const cursorRadius = spread;
  const cursorRadiusSq = cursorRadius * cursorRadius;

  // Movement energy
  if (moved) {
    const speedFactor = Math.min(1, cursorSpeed / 15);
    energy = Math.min(1, energy + ENERGY_GROW * dt * speedFactor);
  } else {
    energy = Math.max(0, energy - ENERGY_DECAY * dt);
  }
  const hasEnergy = energy > 0.01;

  // Dissipation ring
  let dissipateInner = 0;
  let dissipateOuter = 0;
  let dissipateFade = 0;
  if (dissipation.active) {
    dissipation.elapsed += dt;
    if (dissipation.elapsed > DISSIPATE_DURATION) {
      dissipation.active = false;
    } else {
      const progress = dissipation.elapsed / DISSIPATE_DURATION;
      dissipateFade = 1 - progress;
      const ringCenter = dissipation.radius0 + dissipation.elapsed * DISSIPATE_SPEED;
      dissipateInner = Math.max(0, ringCenter - DISSIPATE_RING_WIDTH * 0.5);
      dissipateOuter = ringCenter + DISSIPATE_RING_WIDTH * 0.5;
    }
  }

  const nt = reducedMotion ? 0 : time * NOISE_TIME_SCALE;

  // Both renderers keep drawing until the glow has faded: a skipped frame does not decay it
  const active = interacting || hasEnergy || dissipation.active || pendingPulses.length > 0 || cursorSettling;
  if (active) glowSettlesAt = time + GLOW_SETTLE_MS;
  const settled = time > glowSettlesAt;

  if (gl) {
    // Reduced motion keeps the field still, so a settled frame would repeat the last one;
    // a theme change, resize or restored context (needsRender) draws at once either way
    const skip = settled && !needsRender && (reducedMotion || time - lastGlDraw < GL_IDLE_FRAME_MS);
    if (!skip) {
      // Glow decays over the time since the last state pass, not the last animate call
      const glDt = lastGlDraw ? Math.min(time - lastGlDraw, MAX_DT_MS) : dt;
      needsRender = false;
      lastGlDraw = time;
      gl.draw({
        dt: glDt,
        // The noise lattice repeats every 256 units and every time multiplier used
        // in the shaders maps 1280 to a multiple of 256, so this wrap is seamless.
        // It keeps float32 precise however long the page stays open.
        nt: nt % 1280,
        mouse: { x: mx, y: my },
        cursorRadius,
        energy,
        dissipation: {
          x: dissipation.x,
          y: dissipation.y,
          inner: dissipateInner,
          outer: dissipateOuter,
          fade: dissipation.active ? dissipateFade : 0,
        },
        pulses: pendingPulses,
        color,
      });
      pendingPulses.length = 0;
    }
    scheduleFrame();
    return;
  }

  const maxDissipateRadius = dissipation.active ? dissipateOuter : 0;
  const maxInteractRadius = Math.max(cursorRadius, hasEnergy ? SCATTER_RADIUS : 0, maxDissipateRadius);
  const maxInteractRadiusSq = maxInteractRadius * maxInteractRadius;

  // Noise update pass — every 4th frame
  noiseFrame++;
  const isNoiseFrame = noiseFrame % 4 === 1 && (!reducedMotion || noiseFrame === 1);
  if (isNoiseFrame) {
    needsRender = true;
    for (let i = 0; i < dots.length; i++) {
      const dot = dots[i];
      const n1 = fbm2(dot.nx + nt, dot.ny + nt * 0.6);
      const n2 = noise2d(dot.nx * 2.5 + nt * 3, dot.ny * 2.5 - nt * 2);
      const noiseVal = ((n1 * 0.55 + n2 * 0.45) + 1) * 0.5;
      dot.baseAlpha = noiseVal > 0.35
        ? BASE_OPACITY * Math.min(1, (noiseVal - 0.35) * 3)
        : 0;
      const sn = noise2d(dot.nx * 1.3 + 100 + nt * 2, dot.ny * 1.3 + 200 - nt * 1.4);
      dot.drawSize = Math.max(2, Math.round(dot.size * (0.5 + (sn + 1) * 0.4)) * 2);
    }
  }

  // Skip render if nothing visual has changed: no noise update, no interaction, energy
  // or dissipation, and no glow still fading (it decays only on drawn frames)
  if (!needsRender && settled) {
    scheduleFrame();
    return;
  }
  needsRender = false;

  // Render pass — clear only when we're actually going to draw,
  // so skipped frames keep the previous image visible.
  ctx.clearRect(0, 0, cw, ch);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  if (drawLevel.length < dots.length) allocateDrawBuffers(dots.length);
  levelCounts.fill(0);
  let drawn = 0;

  for (let i = 0; i < dots.length; i++) {
    const dot = dots[i];
    const dx = dot.px - mx;
    const dy = dot.py - my;
    const distSq = dx * dx + dy * dy;

    // Distance from dissipation origin (computed lazily)
    let ddist = -1;
    if (dissipation.active) {
      const ddx = dot.px - dissipation.x;
      const ddy = dot.py - dissipation.y;
      ddist = Math.sqrt(ddx * ddx + ddy * ddy);
    }

    if (dot.baseAlpha < 0.003 && dot.glow <= 0 && distSq > maxInteractRadiusSq
        && (ddist < 0 || ddist > dissipateOuter)) {
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

    if (dot.glow > 0) {
      dot.glow = Math.max(0, dot.glow - GLOW_DECAY * dt);
    }

    // Scatter
    let scatterAlpha = 0;
    if (hasEnergy && distSq < SCATTER_RADIUS_SQ) {
      const scatterNoise = noise2d(dot.nx * 3.7 + nt * 5, dot.ny * 3.7 - nt * 4);
      const threshold = 1 - energy * 0.9;
      if ((scatterNoise + 1) * 0.5 > threshold) {
        const dist = Math.sqrt(distSq);
        scatterAlpha = SCATTER_BOOST * (1 - dist / SCATTER_RADIUS) * energy;
      }
    }

    // Dissipation ring
    let dissipateAlpha = 0;
    if (dissipation.active && ddist >= dissipateInner && ddist <= dissipateOuter) {
      // Position within ring: 0 at edges, 1 at center
      const ringCenter = (dissipateInner + dissipateOuter) * 0.5;
      const halfWidth = DISSIPATE_RING_WIDTH * 0.5;
      const ringPos = 1 - Math.abs(ddist - ringCenter) / halfWidth;
      // Noise variation so dots don't all dissipate uniformly
      const dn = (noise2d(dot.nx * 4.1 + 300, dot.ny * 4.1 + 400) + 1) * 0.5;
      dissipateAlpha = DISSIPATE_BOOST * ringPos * dissipateFade * (0.4 + dn * 0.6);
    }

    const alpha = Math.min(MAX_ALPHA, dot.baseAlpha + dot.glow + scatterAlpha + dissipateAlpha);
    const level = Math.round((alpha / MAX_ALPHA) * (ALPHA_LEVELS - 1));
    if (level === 0) continue;

    const half = dot.drawSize * 0.5;
    drawX[drawn] = dot.px - half + dot.jx;
    drawY[drawn] = dot.py - half + dot.jy;
    drawSize[drawn] = dot.drawSize;
    drawLevel[drawn] = level;
    levelCounts[level]++;
    drawn++;
  }

  // Counting sort by level, then one globalAlpha change per level
  let offset = 0;
  for (let l = 0; l < ALPHA_LEVELS; l++) {
    levelStarts[l] = offset;
    offset += levelCounts[l];
  }
  for (let i = 0; i < drawn; i++) drawOrder[levelStarts[drawLevel[i]]++] = i;
  let next = 0;
  for (let l = 1; l < ALPHA_LEVELS; l++) {
    const count = levelCounts[l];
    if (count === 0) continue;
    ctx.globalAlpha = (l / (ALPHA_LEVELS - 1)) * MAX_ALPHA;
    for (const end = next + count; next < end; next++) {
      const i = drawOrder[next];
      ctx.fillRect(drawX[i], drawY[i], drawSize[i], drawSize[i]);
    }
  }

  ctx.globalAlpha = 1;
  scheduleFrame();
}

// Reused every frame by the Canvas 2D path: each drawn dot's rect and opacity level
let drawX = new Float32Array(0);
let drawY = new Float32Array(0);
let drawSize = new Float32Array(0);
let drawLevel = new Uint8Array(0);
let drawOrder = new Uint32Array(0);
const levelCounts = new Uint32Array(ALPHA_LEVELS);
const levelStarts = new Uint32Array(ALPHA_LEVELS);

function allocateDrawBuffers(n: number) {
  drawX = new Float32Array(n);
  drawY = new Float32Array(n);
  drawSize = new Float32Array(n);
  drawLevel = new Uint8Array(n);
  drawOrder = new Uint32Array(n);
}

/** Lights up the dots around a point, like a keystroke landing; glow decay fades it. */
function applyPulse(x: number, y: number) {
  const rows = Math.ceil(dots.length / gridCols);
  const col0 = Math.max(0, Math.floor((x - PULSE_RADIUS) / CELL_SIZE));
  const col1 = Math.min(gridCols - 1, Math.ceil((x + PULSE_RADIUS) / CELL_SIZE));
  const row0 = Math.max(0, Math.floor((y - PULSE_RADIUS) / CELL_SIZE));
  const row1 = Math.min(rows - 1, Math.ceil((y + PULSE_RADIUS) / CELL_SIZE));
  for (let row = row0; row <= row1; row++) {
    for (let col = col0; col <= col1; col++) {
      const dot = dots[row * gridCols + col];
      if (!dot) continue;
      const dx = dot.px - x;
      const dy = dot.py - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= PULSE_RADIUS) continue;
      const proximity = 1 - dist / PULSE_RADIUS;
      dot.glow = Math.max(dot.glow, PULSE_BOOST * proximity * proximity);
    }
  }
}

/** Sizes the canvas for the current dims and dpr, and hands WebGL2 the dot grid. */
function sizeCanvas() {
  if (gl) {
    const statics = new Float32Array(dots.length * 4);
    for (let i = 0; i < dots.length; i++) {
      statics[i * 4] = dots[i].size;
      statics[i * 4 + 1] = dots[i].jx;
      statics[i * 4 + 2] = dots[i].jy;
    }
    gl.resize(dims.w, dims.h, dpr, gridCols, dots.length / gridCols, statics);
    return;
  }
  canvas.width = dims.w * dpr;
  canvas.height = dims.h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

// --- Frame scheduling ---
// Use requestAnimationFrame when available in worker (Chrome 105+),
// fall back to setTimeout at ~60fps.

const hasRAF = typeof requestAnimationFrame === "function";
let interacting = false;
let idleTimeout: ReturnType<typeof setTimeout>;

function markInteracting() {
  interacting = true;
  needsRender = true;
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => { interacting = false; }, 200);
}

// At most one frame is ever queued, so a visibility toggle while a frame is
// pending cannot start a second render loop.
let framePending = false;

function onFrame(time: number) {
  framePending = false;
  animate(time);
}

function scheduleFrame() {
  if (framePending) return;
  framePending = true;
  if (hasRAF) {
    requestAnimationFrame(onFrame);
  } else {
    setTimeout(() => onFrame(performance.now()), 16);
  }
}

// --- Message handler ---

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      canvas = msg.canvas;
      dpr = msg.dpr;
      isPointerFine = msg.isPointerFine;
      reducedMotion = msg.reducedMotion;
      color = msg.color;
      dims.w = msg.width;
      dims.h = msg.height;
      initNoise();
      dots = createDots(msg.width, msg.height);
      gl = createGlRenderer(canvas, PERM, () => { needsRender = true; });
      if (!gl) ctx = canvas.getContext("2d")!;
      sizeCanvas();
      running = true;
      noiseFrame = 0; // ensure first frame computes noise
      scheduleFrame();
      break;

    case "resize":
      dpr = msg.dpr;
      dims.w = msg.width;
      dims.h = msg.height;
      dots = createDots(msg.width, msg.height);
      sizeCanvas();
      noiseFrame = 0;
      needsRender = true;
      break;

    case "mouse":
      mouse.x = msg.x;
      mouse.y = msg.y;
      markInteracting();
      break;

    case "pulse":
      // Keystrokes typed while the field is paused would all land at once on return
      if (reducedMotion || !visible) break;
      if (gl) {
        if (pendingPulses.length < MAX_PULSES) pendingPulses.push({ x: msg.x, y: msg.y });
      } else {
        applyPulse(msg.x, msg.y);
      }
      markInteracting();
      break;

    case "touchstart":
      mouse.x = msg.x;
      mouse.y = msg.y;
      smoothMouse.x = msg.x;
      smoothMouse.y = msg.y;
      energy = Math.min(1, energy + IMPULSE_ENERGY);
      markInteracting();
      break;

    case "touchmove":
      mouse.x = msg.x;
      mouse.y = msg.y;
      markInteracting();
      break;

    case "touchend":
      dissipation.active = true;
      dissipation.x = smoothMouse.x;
      dissipation.y = smoothMouse.y;
      dissipation.elapsed = 0;
      dissipation.radius0 = spread;
      mouse.x = -9999;
      mouse.y = -9999;
      break;

    case "click":
      energy = Math.min(1, energy + IMPULSE_ENERGY);
      dissipation.active = true;
      dissipation.x = msg.x;
      dissipation.y = msg.y;
      dissipation.elapsed = 0;
      dissipation.radius0 = spread;
      needsRender = true;
      break;

    case "visibility": {
      const wasVisible = visible;
      visible = msg.visible;
      if (!wasVisible && visible) {
        lastTime = 0;
        lastFrameTime = 0;
        scheduleFrame();
      }
      break;
    }

    case "reducedMotion":
      reducedMotion = msg.value;
      noiseFrame = 0;
      needsRender = true;
      break;

    case "theme":
      color = msg.color;
      needsRender = true;
      break;

    case "destroy":
      running = false;
      break;
  }
};
