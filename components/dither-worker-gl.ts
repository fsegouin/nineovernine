// DitherField WebGL Worker — GPU-accelerated noise field rendering.
// Replaces the 2D canvas dot-per-dot approach with a full-screen
// fragment shader, keeping the same visual aesthetic and message protocol.

export {}; // Force module scope to avoid TS conflicts with dither-worker.ts

// --- Shader sources ---

const VERT = `#version 300 es
precision highp float;
in vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec3 u_color;
uniform float u_cursor_radius;
uniform float u_energy;
uniform vec4 u_dissipation; // x, y, inner, outer
uniform float u_dissipate_fade;

out vec4 fragColor;

// --- Permutation table (baked from seed 42) ---

const int PERM_SIZE = 256;

// Hash function replacing permutation table lookup
int hash(int x) {
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = ((x >> 16) ^ x) * 0x45d9f3b;
  x = (x >> 16) ^ x;
  return x & 255;
}

int perm(int x) {
  return hash(x + 42);
}

// --- Perlin noise (2D, classic) ---

// Gradient table matching the original JS implementation:
// [1,1], [-1,1], [1,-1], [-1,-1], [1,0], [-1,0], [0,1], [0,-1]
vec2 grad(int h) {
  int g = h & 7;
  if (g == 0) return vec2( 1.0,  1.0);
  if (g == 1) return vec2(-1.0,  1.0);
  if (g == 2) return vec2( 1.0, -1.0);
  if (g == 3) return vec2(-1.0, -1.0);
  if (g == 4) return vec2( 1.0,  0.0);
  if (g == 5) return vec2(-1.0,  0.0);
  if (g == 6) return vec2( 0.0,  1.0);
  return vec2( 0.0, -1.0);
}

float fade(float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

float noise2d(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  int ix = int(i.x) & 255;
  int iy = int(i.y) & 255;

  float u = fade(f.x);
  float v = fade(f.y);

  int aa = perm(perm(ix) + iy);
  int ba = perm(perm(ix + 1) + iy);
  int ab = perm(perm(ix) + iy + 1);
  int bb = perm(perm(ix + 1) + iy + 1);

  vec2 ga = grad(aa);
  vec2 gb = grad(ba);
  vec2 gc = grad(ab);
  vec2 gd = grad(bb);

  float n00 = dot(ga, f);
  float n10 = dot(gb, f - vec2(1.0, 0.0));
  float n01 = dot(gc, f - vec2(0.0, 1.0));
  float n11 = dot(gd, f - vec2(1.0, 1.0));

  float nx0 = mix(n00, n10, u);
  float nx1 = mix(n01, n11, u);
  return mix(nx0, nx1, v);
}

float fbm2(vec2 p) {
  return noise2d(p) * 0.667 + noise2d(p * 2.0) * 0.333;
}

// --- Deterministic per-cell RNG (matches mulberry32 seeding) ---

float cellRng(vec2 cell, float offset) {
  float seed = cell.x * 7919.0 + cell.y * 104729.0 + 31337.0 + offset;
  // PCG-style hash
  uint s = uint(seed);
  s = s * 747796405u + 2891336453u;
  s = ((s >> ((s >> 28) + 4u)) ^ s) * 277803737u;
  s = (s >> 22) ^ s;
  return float(s) / 4294967296.0;
}

// --- Constants (match 2D worker) ---

const float CELL_SIZE = 8.0;
const float BASE_OPACITY = 0.12;
const float CURSOR_BOOST = 0.4;
const float NOISE_SCALE = 0.02;
const float NOISE_TIME_SCALE = 0.001;
const float SCATTER_RADIUS = 250.0;
const float SCATTER_BOOST = 0.35;
const float DISSIPATE_RING_WIDTH = 100.0;
const float DISSIPATE_BOOST = 0.3;

void main() {
  vec2 pixel = gl_FragCoord.xy;
  // Flip Y: gl_FragCoord has (0,0) at bottom-left, CSS has (0,0) at top-left
  pixel.y = u_resolution.y - pixel.y;

  // Which cell does this pixel belong to?
  vec2 cell = floor(pixel / CELL_SIZE);
  vec2 cellCenter = cell * CELL_SIZE + CELL_SIZE * 0.5;

  // Per-cell random values (seeded deterministically)
  float rng1 = cellRng(cell, 0.0);
  float rng2 = cellRng(cell, 1.0);
  float rng3 = cellRng(cell, 2.0);

  // Dot properties
  float dotSize = 0.5 + rng1 * 1.8;
  vec2 jitter = vec2((rng2 - 0.5) * 2.4, (rng3 - 0.5) * 2.4);
  vec2 dotPos = cellCenter + jitter;

  // Size noise (varies with time)
  float nt = u_time * NOISE_TIME_SCALE;
  vec2 np = cellCenter * NOISE_SCALE;
  float sn = noise2d(np * 1.3 + vec2(100.0, 200.0) + vec2(nt * 2.0, -nt * 1.4));
  float drawSize = max(2.0, floor(dotSize * (0.5 + (sn + 1.0) * 0.4) + 0.5) * 2.0);

  // Is this pixel inside the dot?
  float halfSize = drawSize * 0.5;
  vec2 diff = abs(pixel - dotPos);
  if (diff.x > halfSize || diff.y > halfSize) {
    fragColor = vec4(0.0);
    return;
  }

  // --- Base alpha from noise ---
  float n1 = fbm2(np + vec2(nt, nt * 0.6));
  float n2 = noise2d(np * 2.5 + vec2(nt * 3.0, -nt * 2.0));
  float noiseVal = (n1 * 0.55 + n2 * 0.45 + 1.0) * 0.5;
  float baseAlpha = noiseVal > 0.35
    ? BASE_OPACITY * min(1.0, (noiseVal - 0.35) * 3.0)
    : 0.0;

  // --- Cursor flashlight glow ---
  vec2 toMouse = dotPos - u_mouse;
  float distSq = dot(toMouse, toMouse);
  float cursorRadiusSq = u_cursor_radius * u_cursor_radius;

  float glowAlpha = 0.0;
  if (distSq < cursorRadiusSq) {
    float dist = sqrt(distSq);
    float proximity = 1.0 - dist / u_cursor_radius;
    glowAlpha = CURSOR_BOOST * proximity * proximity;
  }

  // --- Scatter ---
  float scatterAlpha = 0.0;
  if (u_energy > 0.01 && distSq < SCATTER_RADIUS * SCATTER_RADIUS) {
    float scatterNoise = noise2d(np * 3.7 + vec2(nt * 5.0, -nt * 4.0));
    float threshold = 1.0 - u_energy * 0.9;
    if ((scatterNoise + 1.0) * 0.5 > threshold) {
      float dist = sqrt(distSq);
      scatterAlpha = SCATTER_BOOST * (1.0 - dist / SCATTER_RADIUS) * u_energy;
    }
  }

  // --- Dissipation ring ---
  float dissipateAlpha = 0.0;
  if (u_dissipate_fade > 0.0) {
    vec2 toDissipate = dotPos - u_dissipation.xy;
    float ddist = length(toDissipate);
    float inner = u_dissipation.z;
    float outer = u_dissipation.w;
    if (ddist >= inner && ddist <= outer) {
      float ringCenter = (inner + outer) * 0.5;
      float halfWidth = DISSIPATE_RING_WIDTH * 0.5;
      float ringPos = 1.0 - abs(ddist - ringCenter) / halfWidth;
      float dn = (noise2d(np * 4.1 + vec2(300.0, 400.0)) + 1.0) * 0.5;
      dissipateAlpha = DISSIPATE_BOOST * ringPos * u_dissipate_fade * (0.4 + dn * 0.6);
    }
  }

  // --- Final alpha ---
  float alpha = min(0.6, baseAlpha + glowAlpha + scatterAlpha + dissipateAlpha);
  if (alpha < 0.003) {
    fragColor = vec4(0.0);
    return;
  }

  fragColor = vec4(u_color * alpha, alpha);
}`;

// --- Worker state ---

let canvas: OffscreenCanvas;
let gl: WebGL2RenderingContext;
let program: WebGLProgram;
let dpr = 1;
let dims = { w: 0, h: 0 };
let color = { r: 250, g: 250, b: 250 };
let isPointerFine = true;

// Interaction state
const mouse = { x: -9999, y: -9999 };
const smoothMouse = { x: -9999, y: -9999 };
const prevMouse = { x: -9999, y: -9999 };
let spread = 120; // CURSOR_RADIUS_MIN
let energy = 0;

// Dissipation state
const dissipation = { active: false, x: 0, y: 0, elapsed: 0, radius0: 0 };

// Animation state
let visible = true;
let lastTime = 0;
let running = false;

// Uniform locations
let u_resolution: WebGLUniformLocation;
let u_time: WebGLUniformLocation;
let u_mouse: WebGLUniformLocation;
let u_color: WebGLUniformLocation;
let u_cursor_radius: WebGLUniformLocation;
let u_energy: WebGLUniformLocation;
let u_dissipation: WebGLUniformLocation;
let u_dissipate_fade: WebGLUniformLocation;

// --- Constants ---

const CURSOR_RADIUS_MIN = 120;
const CURSOR_RADIUS_MAX = 350;
const SPREAD_GROW = 0.15;
const SPREAD_SHRINK = 0.8;
const MOVE_THRESHOLD = 1.5;
const ENERGY_GROW = 0.004;
const ENERGY_DECAY = 0.003;
const DISSIPATE_SPEED = 0.25;
const DISSIPATE_RING_WIDTH = 100;
const DISSIPATE_DURATION = 1200;

// --- GL setup ---

function compileShader(src: string, type: number): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initGL(): boolean {
  const vs = compileShader(VERT, gl.VERTEX_SHADER);
  const fs = compileShader(FRAG, gl.FRAGMENT_SHADER);
  if (!vs || !fs) return false;

  program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return false;
  }

  gl.useProgram(program);

  // Full-screen quad
  const quad = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const a_pos = gl.getAttribLocation(program, "a_pos");
  gl.enableVertexAttribArray(a_pos);
  gl.vertexAttribPointer(a_pos, 2, gl.FLOAT, false, 0, 0);

  // Cache uniform locations
  u_resolution = gl.getUniformLocation(program, "u_resolution")!;
  u_time = gl.getUniformLocation(program, "u_time")!;
  u_mouse = gl.getUniformLocation(program, "u_mouse")!;
  u_color = gl.getUniformLocation(program, "u_color")!;
  u_cursor_radius = gl.getUniformLocation(program, "u_cursor_radius")!;
  u_energy = gl.getUniformLocation(program, "u_energy")!;
  u_dissipation = gl.getUniformLocation(program, "u_dissipation")!;
  u_dissipate_fade = gl.getUniformLocation(program, "u_dissipate_fade")!;

  // Premultiplied alpha blending
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  return true;
}

// --- Animation loop ---

function animate(time: number) {
  if (!visible || !running) return;

  const dt = lastTime ? time - lastTime : 16;
  lastTime = time;

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

  // Movement energy
  if (moved) {
    const speedFactor = Math.min(1, cursorSpeed / 15);
    energy = Math.min(1, energy + ENERGY_GROW * dt * speedFactor);
  } else {
    energy = Math.max(0, energy - ENERGY_DECAY * dt);
  }

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
      const ringCenter =
        dissipation.radius0 + dissipation.elapsed * DISSIPATE_SPEED;
      dissipateInner = Math.max(
        0,
        ringCenter - DISSIPATE_RING_WIDTH * 0.5,
      );
      dissipateOuter = ringCenter + DISSIPATE_RING_WIDTH * 0.5;
    }
  }

  // Set uniforms
  const w = dims.w * dpr;
  const h = dims.h * dpr;
  gl.viewport(0, 0, w, h);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.uniform2f(u_resolution, w, h);
  gl.uniform1f(u_time, time);
  gl.uniform2f(u_mouse, mx * dpr, my * dpr);
  gl.uniform3f(u_color, color.r / 255, color.g / 255, color.b / 255);
  gl.uniform1f(u_cursor_radius, spread * dpr);
  gl.uniform1f(u_energy, energy);
  gl.uniform4f(
    u_dissipation,
    dissipation.x * dpr,
    dissipation.y * dpr,
    dissipateInner * dpr,
    dissipateOuter * dpr,
  );
  gl.uniform1f(u_dissipate_fade, dissipateFade);

  // Draw
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  scheduleFrame();
}

// --- Frame scheduling ---

const hasRAF = typeof requestAnimationFrame === "function";
let interacting = false;
let idleTimeout: ReturnType<typeof setTimeout>;

function markInteracting() {
  interacting = true;
  clearTimeout(idleTimeout);
  idleTimeout = setTimeout(() => {
    interacting = false;
  }, 200);
}

function scheduleFrame() {
  if (hasRAF) {
    requestAnimationFrame(animate);
  } else {
    const interval = interacting ? 16 : 33;
    setTimeout(() => animate(performance.now()), interval);
  }
}

// --- Message handler (same protocol as 2D worker) ---

self.onmessage = (e: MessageEvent) => {
  const msg = e.data;
  switch (msg.type) {
    case "init": {
      canvas = msg.canvas;
      const ctx = canvas.getContext("webgl2", {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        preserveDrawingBuffer: false,
      });
      if (!ctx) {
        self.postMessage({ type: "gl-failed" });
        return;
      }
      gl = ctx as WebGL2RenderingContext;
      dpr = msg.dpr;
      isPointerFine = msg.isPointerFine;
      color = msg.color;
      dims.w = msg.width;
      dims.h = msg.height;
      canvas.width = msg.width * dpr;
      canvas.height = msg.height * dpr;
      if (!initGL()) {
        self.postMessage({ type: "gl-failed" });
        return;
      }
      running = true;
      scheduleFrame();
      break;
    }

    case "resize":
      dpr = msg.dpr;
      dims.w = msg.width;
      dims.h = msg.height;
      canvas.width = msg.width * dpr;
      canvas.height = msg.height * dpr;
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
