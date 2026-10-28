// Tuning for the hero dither field, shared by the Canvas 2D and WebGL2 renderers
// in dither-worker.ts and dither-gl.ts. Distances are CSS pixels, rates per millisecond.

export const CELL_SIZE = 8;
export const BASE_OPACITY = 0.12;
export const CURSOR_RADIUS_MIN = 120;
export const CURSOR_RADIUS_MAX = 350;
export const CURSOR_BOOST = 0.4;
export const GLOW_DECAY = 0.0015;
export const SPREAD_GROW = 0.15;
export const SPREAD_SHRINK = 0.8;
export const MOVE_THRESHOLD = 1.5;
export const NOISE_SCALE = 0.02;
export const NOISE_TIME_SCALE = 0.001;
export const SCATTER_RADIUS = 250;
export const SCATTER_BOOST = 0.35;
export const ENERGY_GROW = 0.004;
export const ENERGY_DECAY = 0.003;
export const IMPULSE_ENERGY = 0.5;
export const DISSIPATE_SPEED = 0.25;
export const DISSIPATE_RING_WIDTH = 100;
export const DISSIPATE_DURATION = 1200;
export const DISSIPATE_BOOST = 0.3;
// Keystroke pulse from the hero headline's typing cursor
export const PULSE_RADIUS = 100;
export const PULSE_BOOST = 0.5;
export const MAX_ALPHA = 0.6;
// Draw at most about 60 times a second: animation is time-based, so a 120Hz
// display looks the same at half the work. The slack tolerates rAF jitter.
export const MIN_FRAME_MS = 12;
