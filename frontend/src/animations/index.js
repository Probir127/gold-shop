/**
 * Sahara Gold — Animations Barrel Export
 * Central entry point for all animation primitives.
 */
export { default as anime } from 'animejs';
export { default as useAnime, useAnimeTimeline } from './useAnime';
export { useCountUp, default as useCountUpDefault } from './useCountUp';
export { useStaggerReveal, default as useStaggerRevealDefault } from './useStaggerReveal';

export {
  SPRING_LUXURY,
  SPRING_GENTLE,
  SPRING_SNAPPY,
  GOLD_EASE_OUT,
  SMOOTH_DECEL,
  BOUNCE_SOFT,
  staggerGrid,
  staggerRow,
  staggerWave,
} from './easings';

export {
  staggerReveal,
  shimmerLine,
  floatingParticles,
  magneticHover,
  resetMagnetic,
  prefersReducedMotion,
} from './primitives';

