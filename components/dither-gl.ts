// WebGL2 renderer for the hero dither field. Two passes per frame:
// 1. A state pass runs one fragment per dot (a texture of cols x rows texels) and
//    works out its glow, opacity and size, ping-ponging the glow so it decays.
// 2. A draw pass renders one instanced quad per dot from that state.
// The worker keeps the cursor, energy and dissipation maths on the CPU and passes
// the results in as uniforms; the per-dot work never touches the CPU.

import {
  BASE_OPACITY,
  CELL_SIZE,
  CURSOR_BOOST,
  DISSIPATE_BOOST,
  DISSIPATE_RING_WIDTH,
  GLOW_DECAY,
  MAX_ALPHA,
  NOISE_SCALE,
  PULSE_BOOST,
  PULSE_RADIUS,
  SCATTER_BOOST,
  SCATTER_RADIUS,
} from "./dither-config";

export const MAX_PULSES = 8;

// The state texture is 8-bit, so glow is stored as glow / its peak
const GLOW_MAX = Math.max(CURSOR_BOOST, PULSE_BOOST);
// Dot sizes are even whole pixels up to 6, stored as size / 16
const SIZE_SCALE = 16;

export interface GlFrame {
  dt: number;
  /** Noise time, already wrapped to stay precise in float32 */
  nt: number;
  mouse: { x: number; y: number };
  cursorRadius: number;
  energy: number;
  /** Ring centre and inner/outer radius; fade is 0 when no ring is active */
  dissipation: { x: number; y: number; inner: number; outer: number; fade: number };
  pulses: { x: number; y: number }[];
  color: { r: number; g: number; b: number };
}

export interface GlRenderer {
  /** Per-dot static data: size, x jitter, y jitter for each cell, row by row */
  resize(width: number, height: number, dpr: number, cols: number, rows: number, statics: Float32Array): void;
  draw(frame: GlFrame): void;
}

const f = (n: number) => (Number.isInteger(n) ? n.toFixed(1) : String(n));

const DEFINES = `
#define CELL_SIZE ${f(CELL_SIZE)}
#define NOISE_SCALE ${f(NOISE_SCALE)}
#define BASE_OPACITY ${f(BASE_OPACITY)}
#define CURSOR_BOOST ${f(CURSOR_BOOST)}
#define GLOW_DECAY ${f(GLOW_DECAY)}
#define GLOW_MAX ${f(GLOW_MAX)}
#define SCATTER_RADIUS ${f(SCATTER_RADIUS)}
#define SCATTER_BOOST ${f(SCATTER_BOOST)}
#define DISSIPATE_RING_WIDTH ${f(DISSIPATE_RING_WIDTH)}
#define DISSIPATE_BOOST ${f(DISSIPATE_BOOST)}
#define PULSE_RADIUS ${f(PULSE_RADIUS)}
#define PULSE_BOOST ${f(PULSE_BOOST)}
#define MAX_ALPHA ${f(MAX_ALPHA)}
#define SIZE_SCALE ${f(SIZE_SCALE)}
#define MAX_PULSES ${MAX_PULSES}
`;

// The same classic Perlin noise as the worker's CPU version, reading the same
// permutation table from a texture, so both renderers draw the same field.
const NOISE = `
uniform highp usampler2D u_perm;
const vec2 GRAD[8] = vec2[8](
  vec2(1.0, 1.0), vec2(-1.0, 1.0), vec2(1.0, -1.0), vec2(-1.0, -1.0),
  vec2(1.0, 0.0), vec2(-1.0, 0.0), vec2(0.0, 1.0), vec2(0.0, -1.0)
);
int perm(int i) { return int(texelFetch(u_perm, ivec2(i, 0), 0).r); }
float fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }
float noise2d(vec2 p) {
  vec2 i0 = floor(p);
  int xi = int(i0.x) & 255;
  int yi = int(i0.y) & 255;
  vec2 fr = p - i0;
  float u = fade(fr.x);
  float v = fade(fr.y);
  int aa = perm(perm(xi) + yi) % 8;
  int ab = perm(perm(xi) + yi + 1) % 8;
  int ba = perm(perm(xi + 1) + yi) % 8;
  int bb = perm(perm(xi + 1) + yi + 1) % 8;
  return dot(GRAD[aa], fr) * (1.0 - u) * (1.0 - v)
    + dot(GRAD[ba], fr - vec2(1.0, 0.0)) * u * (1.0 - v)
    + dot(GRAD[ab], fr - vec2(0.0, 1.0)) * (1.0 - u) * v
    + dot(GRAD[bb], fr - vec2(1.0, 1.0)) * u * v;
}
float fbm2(vec2 p) { return noise2d(p) * 0.667 + noise2d(p * 2.0) * 0.333; }
`;

const FULLSCREEN_VERT = `#version 300 es
void main() {
  // One triangle covering the viewport, from the vertex index alone
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const STATE_FRAG = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${DEFINES}
${NOISE}
uniform sampler2D u_prev;
uniform sampler2D u_static;
uniform float u_nt;
uniform float u_dt;
uniform vec2 u_mouse;
uniform float u_cursorRadius;
uniform float u_energy;
uniform vec4 u_dissipation;
uniform float u_dissipateFade;
uniform vec2 u_pulses[MAX_PULSES];
uniform int u_pulseCount;
out vec4 outState;

void main() {
  ivec2 cell = ivec2(gl_FragCoord.xy);
  vec2 p = (vec2(cell) + 0.5) * CELL_SIZE;
  vec2 n = p * NOISE_SCALE;
  float size = texelFetch(u_static, cell, 0).r;

  float n1 = fbm2(vec2(n.x + u_nt, n.y + u_nt * 0.6));
  float n2 = noise2d(vec2(n.x * 2.5 + u_nt * 3.0, n.y * 2.5 - u_nt * 2.0));
  float nv = ((n1 * 0.55 + n2 * 0.45) + 1.0) * 0.5;
  float baseAlpha = nv > 0.35 ? BASE_OPACITY * min(1.0, (nv - 0.35) * 3.0) : 0.0;
  float sn = noise2d(vec2(n.x * 1.3 + 100.0 + u_nt * 2.0, n.y * 1.3 + 200.0 - u_nt * 1.4));
  float drawSize = max(2.0, floor(size * (0.5 + (sn + 1.0) * 0.4) + 0.5) * 2.0);

  // Decay first, so whatever the cursor or a keystroke lights this frame is drawn at full strength
  float glow = max(0.0, texelFetch(u_prev, cell, 0).r * GLOW_MAX - GLOW_DECAY * u_dt);
  for (int i = 0; i < MAX_PULSES; i++) {
    if (i >= u_pulseCount) break;
    float d = distance(p, u_pulses[i]);
    if (d < PULSE_RADIUS) {
      float pr = 1.0 - d / PULSE_RADIUS;
      glow = max(glow, PULSE_BOOST * pr * pr);
    }
  }
  vec2 dm = p - u_mouse;
  float distSq = dot(dm, dm);
  if (distSq < u_cursorRadius * u_cursorRadius) {
    float pr = 1.0 - sqrt(distSq) / u_cursorRadius;
    glow = max(glow, CURSOR_BOOST * pr * pr);
  }

  float scatter = 0.0;
  if (u_energy > 0.01 && distSq < SCATTER_RADIUS * SCATTER_RADIUS) {
    float s = noise2d(vec2(n.x * 3.7 + u_nt * 5.0, n.y * 3.7 - u_nt * 4.0));
    if ((s + 1.0) * 0.5 > 1.0 - u_energy * 0.9) {
      scatter = SCATTER_BOOST * (1.0 - sqrt(distSq) / SCATTER_RADIUS) * u_energy;
    }
  }

  float dissipate = 0.0;
  if (u_dissipateFade > 0.0) {
    float dd = distance(p, u_dissipation.xy);
    if (dd >= u_dissipation.z && dd <= u_dissipation.w) {
      float ringCenter = (u_dissipation.z + u_dissipation.w) * 0.5;
      float ringPos = 1.0 - abs(dd - ringCenter) / (DISSIPATE_RING_WIDTH * 0.5);
      float dn = (noise2d(vec2(n.x * 4.1 + 300.0, n.y * 4.1 + 400.0)) + 1.0) * 0.5;
      dissipate = DISSIPATE_BOOST * ringPos * u_dissipateFade * (0.4 + dn * 0.6);
    }
  }

  float alpha = min(MAX_ALPHA, baseAlpha + glow + scatter + dissipate);
  outState = vec4(glow / GLOW_MAX, alpha / MAX_ALPHA, drawSize / SIZE_SCALE, 1.0);
}`;

const DOT_VERT = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
${DEFINES}
uniform sampler2D u_state;
uniform sampler2D u_static;
uniform int u_cols;
uniform vec2 u_resolution;
in vec2 a_corner;
flat out float v_alpha;

void main() {
  ivec2 cell = ivec2(gl_InstanceID % u_cols, gl_InstanceID / u_cols);
  vec4 state = texelFetch(u_state, cell, 0);
  float alpha = state.g * MAX_ALPHA;
  v_alpha = alpha;
  if (alpha < 0.003) {
    // Outside the clip volume, so the quad is culled
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    return;
  }
  float drawSize = floor(state.b * SIZE_SCALE + 0.5);
  vec2 jitter = texelFetch(u_static, cell, 0).gb;
  vec2 pos = (vec2(cell) + 0.5) * CELL_SIZE - drawSize * 0.5 + jitter + a_corner * drawSize;
  vec2 clip = pos / u_resolution * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const DOT_FRAG = `#version 300 es
precision highp float;
uniform vec3 u_color;
flat in float v_alpha;
out vec4 outColor;
void main() {
  outColor = vec4(u_color * v_alpha, v_alpha);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`Dither shader failed to compile: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string): WebGLProgram {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vert));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, frag));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`Dither program failed to link: ${gl.getProgramInfoLog(program)}`);
  }
  return program;
}

function uniforms(gl: WebGL2RenderingContext, program: WebGLProgram, names: string[]) {
  return Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(program, n)]));
}

function texture(gl: WebGL2RenderingContext): WebGLTexture {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return tex;
}

// Compiles the programs on a throwaway canvas first: a canvas that has handed out
// a WebGL2 context can no longer give a 2D one, so a driver that rejects the
// shaders must be caught before the real canvas is committed.
function shadersCompile(): boolean {
  const probe = new OffscreenCanvas(1, 1).getContext("webgl2");
  if (!probe) return false;
  try {
    link(probe, FULLSCREEN_VERT, STATE_FRAG);
    link(probe, DOT_VERT, DOT_FRAG);
    return true;
  } catch (err) {
    console.warn(err);
    return false;
  } finally {
    probe.getExtension("WEBGL_lose_context")?.loseContext();
  }
}

/**
 * Returns null when the canvas cannot give a WebGL2 context, so the caller can
 * fall back to Canvas 2D. Once it has a context the canvas is committed to WebGL2.
 * onRestored runs once a lost context is rebuilt, so the caller can redraw a still frame.
 */
export function createGlRenderer(
  canvas: OffscreenCanvas,
  perm: Uint8Array,
  onRestored?: () => void,
): GlRenderer | null {
  if (!shadersCompile()) return null;
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: "low-power",
  });
  if (!gl) return null;

  let lost = false;
  let size: { width: number; height: number; dpr: number; cols: number; rows: number; statics: Float32Array } =
    { width: 0, height: 0, dpr: 1, cols: 0, rows: 0, statics: new Float32Array(0) };

  let stateProgram: WebGLProgram;
  let dotProgram: WebGLProgram;
  let su: Record<string, WebGLUniformLocation | null>;
  let du: Record<string, WebGLUniformLocation | null>;
  let emptyVao: WebGLVertexArrayObject;
  let dotVao: WebGLVertexArrayObject;
  let permTex: WebGLTexture;
  let staticTex: WebGLTexture;
  let stateTex: WebGLTexture[] = [];
  let stateFbo: WebGLFramebuffer[] = [];
  let current = 0;

  function setup() {
    stateProgram = link(gl!, FULLSCREEN_VERT, STATE_FRAG);
    dotProgram = link(gl!, DOT_VERT, DOT_FRAG);
    su = uniforms(gl!, stateProgram, [
      "u_perm", "u_prev", "u_static", "u_nt", "u_dt", "u_mouse", "u_cursorRadius",
      "u_energy", "u_dissipation", "u_dissipateFade", "u_pulses", "u_pulseCount",
    ]);
    du = uniforms(gl!, dotProgram, ["u_state", "u_static", "u_cols", "u_resolution", "u_color"]);

    emptyVao = gl!.createVertexArray()!;
    dotVao = gl!.createVertexArray()!;
    gl!.bindVertexArray(dotVao);
    const corners = gl!.createBuffer();
    gl!.bindBuffer(gl!.ARRAY_BUFFER, corners);
    gl!.bufferData(gl!.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl!.STATIC_DRAW);
    const loc = gl!.getAttribLocation(dotProgram, "a_corner");
    gl!.enableVertexAttribArray(loc);
    gl!.vertexAttribPointer(loc, 2, gl!.FLOAT, false, 0, 0);
    gl!.bindVertexArray(null);

    permTex = texture(gl!);
    gl!.pixelStorei(gl!.UNPACK_ALIGNMENT, 1);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.R8UI, perm.length, 1, 0, gl!.RED_INTEGER, gl!.UNSIGNED_BYTE, perm);

    staticTex = texture(gl!);
    stateTex = [texture(gl!), texture(gl!)];
    stateFbo = [gl!.createFramebuffer()!, gl!.createFramebuffer()!];

    gl!.blendFunc(gl!.ONE, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.clearColor(0, 0, 0, 0);
    if (size.cols > 0) allocate();
  }

  // Sizes the per-dot textures; the glow state starts at zero
  function allocate() {
    const { cols, rows, statics } = size;
    gl!.bindTexture(gl!.TEXTURE_2D, staticTex);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA32F, cols, rows, 0, gl!.RGBA, gl!.FLOAT, statics);
    for (let i = 0; i < 2; i++) {
      gl!.bindTexture(gl!.TEXTURE_2D, stateTex[i]);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, cols, rows, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, null);
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, stateFbo[i]);
      gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, stateTex[i], 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
    }
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
    current = 0;
  }

  function bindTexture(unit: number, tex: WebGLTexture) {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
  }

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
  });
  canvas.addEventListener("webglcontextrestored", () => {
    // Stays lost if the rebuild fails, so draw keeps returning early instead of
    // issuing calls against a half-built pipeline every frame
    try {
      setup();
    } catch (err) {
      console.warn(err);
      return;
    }
    lost = false;
    onRestored?.();
  });

  setup();

  const pulseData = new Float32Array(MAX_PULSES * 2);

  return {
    resize(width, height, dpr, cols, rows, statics) {
      size = { width, height, dpr, cols, rows, statics };
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      if (!lost) allocate();
    },

    draw(frame) {
      if (lost || size.cols === 0) return;
      const { cols, rows } = size;
      const next = 1 - current;

      // State pass: one fragment per dot
      gl.bindFramebuffer(gl.FRAMEBUFFER, stateFbo[next]);
      gl.viewport(0, 0, cols, rows);
      gl.disable(gl.BLEND);
      gl.useProgram(stateProgram);
      gl.bindVertexArray(emptyVao);
      bindTexture(0, permTex);
      bindTexture(1, stateTex[current]);
      bindTexture(2, staticTex);
      gl.uniform1i(su.u_perm, 0);
      gl.uniform1i(su.u_prev, 1);
      gl.uniform1i(su.u_static, 2);
      gl.uniform1f(su.u_nt, frame.nt);
      gl.uniform1f(su.u_dt, frame.dt);
      gl.uniform2f(su.u_mouse, frame.mouse.x, frame.mouse.y);
      gl.uniform1f(su.u_cursorRadius, frame.cursorRadius);
      gl.uniform1f(su.u_energy, frame.energy);
      const d = frame.dissipation;
      gl.uniform4f(su.u_dissipation, d.x, d.y, d.inner, d.outer);
      gl.uniform1f(su.u_dissipateFade, d.fade);
      const count = Math.min(MAX_PULSES, frame.pulses.length);
      for (let i = 0; i < count; i++) {
        pulseData[i * 2] = frame.pulses[i].x;
        pulseData[i * 2 + 1] = frame.pulses[i].y;
      }
      gl.uniform2fv(su.u_pulses, pulseData);
      gl.uniform1i(su.u_pulseCount, count);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // Draw pass: one quad per dot
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.useProgram(dotProgram);
      gl.bindVertexArray(dotVao);
      bindTexture(1, stateTex[next]);
      bindTexture(2, staticTex);
      gl.uniform1i(du.u_state, 1);
      gl.uniform1i(du.u_static, 2);
      gl.uniform1i(du.u_cols, cols);
      gl.uniform2f(du.u_resolution, size.width, size.height);
      const { r, g, b } = frame.color;
      gl.uniform3f(du.u_color, r / 255, g / 255, b / 255);
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, cols * rows);
      gl.bindVertexArray(null);

      current = next;
    },
  };
}
