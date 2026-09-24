/**
 * Sahara Gold — useStaggerReveal
 * Staggered entrance animation for lists, grids, and text lines.
 * Animates children of a container element on intersection.
 *
 * Usage:
 *   const containerRef = useStaggerReveal({ selector: '.card', delay: 60 });
 *   <div ref={containerRef}> <Card /> <Card /> </div>
 */
import { useRef, useEffect } from 'react';
import anime from 'animejs';
import { GOLD_EASE_OUT, staggerGrid } from './easings';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {Object} opts
 * @param {string}   opts.selector     - CSS selector for children to animate
 * @param {number}   opts.delay        - Stagger delay in ms between children (default: 80)
 * @param {number}   opts.duration     - Per-element duration (default: 700)
 * @param {number}   opts.translateY   - Y-axis offset to start from (default: 40)
 * @param {number}   opts.translateX   - X-axis offset to start from (default: 0)
 * @param {string}   opts.easing       - Anime.js easing preset
 * @param {boolean}  opts.triggerOnce  - Only run once (default: true)
 * @param {number}   opts.threshold    - IntersectionObserver threshold (default: 0.1)
 */
export function useStaggerReveal({
  selector = ':scope > *',
  delay = 80,
  duration = 700,
  translateY = 40,
  translateX = 0,
  easing = GOLD_EASE_OUT,
  triggerOnce = true,
  threshold = 0.1,
} = {}) {
  const containerRef = useRef(null);
  const hasPlayed   = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Set hidden state immediately
    if (!prefersReducedMotion()) {
      const targets = el.querySelectorAll(selector);
      targets.forEach(t => {
        t.style.opacity = '0';
        t.style.transform = `translate(${translateX}px, ${translateY}px)`;
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          if (triggerOnce && hasPlayed.current) return;
          hasPlayed.current = true;

          const targets = el.querySelectorAll(selector);
          if (!targets.length) return;

          if (prefersReducedMotion()) {
            targets.forEach(t => {
              t.style.opacity = '1';
              t.style.transform = 'none';
            });
            return;
          }

          anime({
            targets: Array.from(targets),
            opacity: [0, 1],
            translateY: [translateY, 0],
            translateX: [translateX, 0],
            duration,
            easing,
            delay: staggerGrid(delay),
          });
        });
      },
      { threshold }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      // Reset state: allow re-reveal if component remounts
      hasPlayed.current = false;
    };
  }, [selector, delay, duration, translateY, translateX, easing, triggerOnce, threshold]);

  return containerRef;
}

export default useStaggerReveal;
