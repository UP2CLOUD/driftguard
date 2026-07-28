"use client";

import { useEffect, useState } from "react";

// Matches Tailwind's `md` breakpoint — below this, treat as a mobile
// viewport for the purpose of skipping expensive decorative effects
// (WebGL canvases, large particle counts) in favor of static fallbacks.
const QUERY = "(max-width: 767px)";

/**
 * SSR-safe: returns `false` on the server and during first paint (so
 * server-rendered markup matches the client's first render and hydration
 * doesn't warn), then syncs to the real value after mount.
 */
export function useIsMobileViewport(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setMobile(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return mobile;
}
