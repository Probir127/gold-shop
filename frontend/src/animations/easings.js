/**
 * Sahara Gold — Luxury Easing Curves
 * Anime.js custom easing presets for a cinematic gold experience.
 */

// Spring: feels physically "real" — used for card entrances, pop-in counters
export const SPRING_LUXURY = 'spring(1, 80, 10, 0)';

// Spring: very gentle, for large panels sliding in
export const SPRING_GENTLE = 'spring(1, 60, 8, 0)';

// Spring: snappy micro-interactions (badges, icons)
export const SPRING_SNAPPY = 'spring(1, 90, 14, 0)';

// Custom cubic bezier — "gold ease out": fast start, velvet deceleration
export const GOLD_EASE_OUT = 'cubicBezier(0.16, 1, 0.3, 1)';

// Smooth deceleration for long reveal sweeps
export const SMOOTH_DECEL = 'cubicBezier(0.25, 0.46, 0.45, 0.94)';

// Overshoot bounce for count-up and KPI roll
export const BOUNCE_SOFT = 'easeOutElastic(1, .6)';

// Stagger delay generators
export const staggerGrid = (base = 60) => (el, i) => i * base;
export const staggerRow  = (base = 80) => (el, i) => i * base;
export const staggerWave = (base = 50, rows = 4) =>
  (el, i) => (i % rows) * base + Math.floor(i / rows) * (base / 2);
