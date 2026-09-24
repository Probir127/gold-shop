/**
 * Sahara Gold — useAnime
 * Memory-safe React hook wrapping Anime.js.
 * Automatically pauses + removes animation on component unmount.
 *
 * Usage:
 *   const { animeRef, play } = useAnime({ targets: '.card', opacity: [0, 1], ... });
 */
import { useEffect, useRef, useCallback } from 'react';
import anime from 'animejs';

/**
 * useAnime — single animation instance with auto-cleanup.
 * @param {Object} params - Anime.js params (targets, properties, easing, etc.)
 * @param {boolean} autoplay - Start automatically on mount (default: true)
 */
export function useAnime(params, autoplay = true) {
  const instanceRef = useRef(null);

  const play = useCallback(() => {
    if (instanceRef.current) {
      instanceRef.current.pause();
      instanceRef.current.seek(0);
    }
    instanceRef.current = anime({ ...params, autoplay: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    instanceRef.current?.pause();
  }, []);

  const restart = useCallback(() => {
    instanceRef.current?.restart();
  }, []);

  useEffect(() => {
    if (autoplay) {
      instanceRef.current = anime({ ...params, autoplay: true });
    }
    return () => {
      // Clean up: pause and remove targets to prevent memory leaks
      if (instanceRef.current) {
        instanceRef.current.pause();
        if (params.targets) {
          anime.remove(params.targets);
        }
        instanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { animeRef: instanceRef, play, pause, restart };
}

/**
 * useAnimeTimeline — timeline with auto-cleanup.
 * @param {Object} timelineParams - anime.timeline() config (defaults, loop, etc.)
 * @param {function} buildTimeline - function that receives tl and adds .add() steps
 * @param {boolean} autoplay
 */
export function useAnimeTimeline(timelineParams = {}, buildTimeline, autoplay = true) {
  const tlRef = useRef(null);

  const play = useCallback(() => {
    tlRef.current?.play();
  }, []);

  const pause = useCallback(() => {
    tlRef.current?.pause();
  }, []);

  const restart = useCallback(() => {
    tlRef.current?.restart();
  }, []);

  useEffect(() => {
    const tl = anime.timeline({ ...timelineParams, autoplay });
    buildTimeline(tl);
    tlRef.current = tl;

    return () => {
      tl.pause();
      tlRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { tlRef, play, pause, restart };
}

export default useAnime;
