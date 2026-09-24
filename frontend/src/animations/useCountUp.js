/**
 * Sahara Gold — useCountUp
 * Anime.js kinetic rolling counter for gold prices, KPIs, and stats.
 * Animates a numeric value from 0 (or prev) to target with luxury spring feel.
 *
 * Usage:
 *   const displayRef = useCountUp(targetValue, { suffix: '+', duration: 1400 });
 *   <span ref={displayRef} />
 */
import { useRef, useEffect, useCallback } from 'react';
import anime from 'animejs';
import { SMOOTH_DECEL } from './easings';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {number} target      - The final number to count up to
 * @param {Object} opts
 * @param {string} opts.prefix - Text prepended to number (e.g. '৳')
 * @param {string} opts.suffix - Text appended to number (e.g. '%', '+')
 * @param {number} opts.duration - Animation duration in ms (default: 1600)
 * @param {number} opts.decimals - Number of decimal places (default: 0)
 * @param {string} opts.easing  - Anime.js easing string
 * @param {boolean} opts.triggerOnce - Only animate first time in view
 */
export function useCountUp(target, {
  prefix = '',
  suffix = '',
  duration = 1600,
  decimals = 0,
  easing = SMOOTH_DECEL,
  triggerOnce = true,
} = {}) {
  const elRef    = useRef(null);
  const countRef = useRef({ val: 0 });
  const animRef  = useRef(null);
  const fired    = useRef(false);

  const animate = useCallback(() => {
    if (triggerOnce && fired.current) return;
    fired.current = true;

    if (prefersReducedMotion()) {
      if (elRef.current) {
        elRef.current.textContent = `${prefix}${target.toLocaleString()}${suffix}`;
      }
      return;
    }

    if (animRef.current) animRef.current.pause();
    const from = countRef.current.val;

    animRef.current = anime({
      targets: countRef.current,
      val: [from, target],
      duration,
      easing,
      update() {
        if (!elRef.current) return;
        const v = parseFloat(countRef.current.val.toFixed(decimals));
        elRef.current.textContent =
          `${prefix}${v.toLocaleString('en-BD', { minimumFractionDigits: decimals })}${suffix}`;
      },
    });
  }, [target, prefix, suffix, duration, decimals, easing, triggerOnce]);

  // IntersectionObserver-based trigger
  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    // Set initial display
    el.textContent = `${prefix}0${suffix}`;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) animate();
        });
      },
      { threshold: 0.3 }
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      animRef.current?.pause();
      animRef.current = null;
    };
  }, [animate, prefix, suffix]);

  // Re-animate on target change (e.g. live rate update)
  useEffect(() => {
    if (fired.current && !triggerOnce) {
      fired.current = false;
      animate();
    }
  }, [target, animate, triggerOnce]);

  return elRef;
}

export default useCountUp;
