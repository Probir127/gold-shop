/**
 * Sahara Gold — Kinetic Motion Primitives
 * High-performance Anime.js primitives for luxury jewelry UI.
 */
import anime from 'animejs';
import { GOLD_EASE_OUT, SPRING_LUXURY, SMOOTH_DECEL } from './easings';

/**
 * Checks OS prefers-reduced-motion preference.
 */
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Staggered reveal animation for grids, lists, or split text.
 * @param {string|Element|NodeList|Array} targets - Elements to animate
 * @param {Object} options - Custom overrides
 */
export function staggerReveal(targets, options = {}) {
  if (prefersReducedMotion()) {
    anime.set(targets, { opacity: 1, translateY: 0, scale: 1 });
    return null;
  }

  const {
    delay = 70,
    duration = 800,
    translateY = [35, 0],
    scale = [0.96, 1],
    opacity = [0, 1],
    easing = GOLD_EASE_OUT,
    complete = null,
  } = options;

  return anime({
    targets,
    opacity,
    translateY,
    scale,
    delay: anime.stagger(delay),
    duration,
    easing,
    complete,
  });
}

/**
 * Shimmer line animation for SVG paths, borders, or gold dividers.
 * @param {string|Element} target - SVG path or line element
 * @param {Object} options
 */
export function shimmerLine(target, options = {}) {
  if (prefersReducedMotion()) {
    anime.set(target, { strokeDashoffset: 0, opacity: 1 });
    return null;
  }

  const {
    duration = 1600,
    easing = 'easeInOutSine',
    loop = false,
  } = options;

  return anime({
    targets: target,
    strokeDashoffset: [anime.setDashoffset, 0],
    opacity: [0.3, 1],
    duration,
    easing,
    loop,
  });
}

/**
 * Ambient floating gold particles generator.
 * @param {string|Element|Array} targets - Particle elements
 * @param {Object} options
 */
export function floatingParticles(targets, options = {}) {
  if (prefersReducedMotion()) return null;

  const {
    duration = 5000,
    rangeX = 30,
    rangeY = 40,
  } = options;

  return anime({
    targets,
    translateX: () => anime.random(-rangeX, rangeX),
    translateY: () => anime.random(-rangeY, rangeY),
    opacity: [
      { value: () => anime.random(0.2, 0.8), duration: duration * 0.5 },
      { value: () => anime.random(0.1, 0.4), duration: duration * 0.5 },
    ],
    scale: () => anime.random(0.7, 1.3),
    easing: 'easeInOutQuad',
    duration: () => anime.random(duration * 0.8, duration * 1.4),
    complete: () => floatingParticles(targets, options),
  });
}

/**
 * Magnetic button micro-interaction on hover.
 * @param {Element} element
 * @param {MouseEvent} event
 * @param {number} pullStrength (0.1 to 0.5)
 */
export function magneticHover(element, event, pullStrength = 0.25) {
  if (!element || prefersReducedMotion()) return;
  const rect = element.getBoundingClientRect();
  const x = (event.clientX - (rect.left + rect.width / 2)) * pullStrength;
  const y = (event.clientY - (rect.top + rect.height / 2)) * pullStrength;

  anime({
    targets: element,
    translateX: x,
    translateY: y,
    duration: 350,
    easing: 'easeOutQuad',
  });
}

/**
 * Reset magnetic element on mouse leave.
 * @param {Element} element
 */
export function resetMagnetic(element) {
  if (!element || prefersReducedMotion()) return;
  anime({
    targets: element,
    translateX: 0,
    translateY: 0,
    duration: 700,
    easing: SPRING_LUXURY,
  });
}
