"use client";

import { useEffect, useState } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

/**
 * SSR-safe hook that reports whether the user has requested reduced motion.
 * Returns `false` on the server and during first paint, then syncs to the
 * real value once mounted. Use it to short-circuit JS-driven animations
 * (requestAnimationFrame counters, setInterval reveals) that CSS media
 * queries cannot reach.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setReduced(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    // Safari < 14 lacks addEventListener on MediaQueryList; fall back to the
    // deprecated addListener/removeListener API.
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return reduced;
}
