// DitherField Web Worker — all noise computation and canvas rendering
// runs off the main thread so scrolling stays at 60fps.

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
const SCATTER_RADIUS_SQ = SCATTER_RADIUS * SCATTER_RADIUS;
const DISSIPATE_SPEED = 0.25;
const DISSIPATE_RING_WIDTH = 100;
const DISSIPATE_DURATION = 1200;
const DISSIPATE_BOOST = 0.3;

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
let dots: Dot[] = [];
let dpr = 1;
let dims = { w: 0, h: 0 };
let color = { r: 250, g: 250, b: 250 };
let isPointerFine = true;

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
let noiseFrame = 0;
let running = false;

// --- Animation loop ---

function animate(time: number) {
  if (!visible || !running) return;

  // No frame skipping needed — worker runs off main thread

  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;

  const { w: cw, h: ch } = dims;
  ctx.clearRect(0, 0, cw, ch);

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
  if (!moved && mx > 0 && my > 0) {
    spread = Math.min(CURSOR_RADIUS_MAX, spread + SPREAD_GROW * dt);
  } else {
    spread = Math.max(CURSOR_RADIUS_MIN, spread - SPREAD_SHRINK * dt);
  }
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

  const nt = time * NOISE_TIME_SCALE;
  const maxDissipateRadius = dissipation.active ? dissipateOuter : 0;
  const maxInteractRadius = Math.max(cursorRadius, hasEnergy ? SCATTER_RADIUS : 0, maxDissipateRadius);
  const maxInteractRadiusSq = maxInteractRadius * maxInteractRadius;

  // Noise update pass — every 4th frame
  noiseFrame++;
  if (noiseFrame % 4 === 1) {
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

  // Render pass
  ctx.fillStyle = `rgb(${r},${g},${b})`;

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

    const alpha = Math.min(0.6, dot.baseAlpha + dot.glow + scatterAlpha + dissipateAlpha);
    if (alpha < 0.003) continue;

    const half = dot.drawSize * 0.5;
    ctx.globalAlpha = alpha;
    ctx.fillRect(dot.px - half + dot.jx, dot.py - half + dot.jy, dot.drawSize, dot.drawSize);
  }

  ctx.globalAlpha = 1;
  scheduleFrame();
}

// --- Frame scheduling ---
// Use requestAnimationFrame when available in worker (Chrome 105+),
// fall back to setTimeout. Throttle to ~30fps when not interacting.

const hasRAF = typeof requestAnimationFrame === "function";
let interacting = false;
let idleTimeout: ReturnType<typeof setTimeout>;

function markInteracting() {
  interacting = true;
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => { interacting = false; }, 200);
}

function scheduleFrame() {
  if (hasRAF) {
    requestAnimationFrame(animate);
  } else {
    const interval = interacting ? 16 : 33;
    setTimeout(() => animate(performance.now()), interval);
  }
}

// --- Message handler ---

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case "init":
      canvas = msg.canvas;
      ctx = canvas.getContext("2d")!;
      dpr = msg.dpr;
      isPointerFine = msg.isPointerFine;
      color = msg.color;
      dims.w = msg.width;
      dims.h = msg.height;
      canvas.width = msg.width * dpr;
      canvas.height = msg.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      initNoise();
      dots = createDots(msg.width, msg.height);
      running = true;
      noiseFrame = 0; // ensure first frame computes noise
      scheduleFrame();
      break;

    case "resize":
      dpr = msg.dpr;
      dims.w = msg.width;
      dims.h = msg.height;
      canvas.width = msg.width * dpr;
      canvas.height = msg.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = createDots(msg.width, msg.height);
      noiseFrame = 0;
      break;

    case "mouse":
      mouse.x = msg.x;
      mouse.y = msg.y;
      markInteracting();
      break;

    case "touchstart":
      mouse.x = msg.x;
      mouse.y = msg.y;
      smoothMouse.x = msg.x;
      smoothMouse.y = msg.y;
      energy = Math.min(1, energy + 0.5);
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
      energy = Math.min(1, energy + 0.5);
      dissipation.active = true;
      dissipation.x = msg.x;
      dissipation.y = msg.y;
      dissipation.elapsed = 0;
      dissipation.radius0 = spread;
      break;

    case "visibility": {
      const wasVisible = visible;
      visible = msg.visible;
      if (!wasVisible && visible) {
        lastTime = 0;
        scheduleFrame();
      }
      break;
    }

    case "theme":
      color = msg.color;
      break;

    case "destroy":
      running = false;
      break;
  }
};
