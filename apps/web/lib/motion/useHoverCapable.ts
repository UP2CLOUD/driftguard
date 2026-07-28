"use client";

import { useEffect, useState } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

/**
 * True only on devices with a real hover-capable, fine pointer (mouse/trackpad).
 * Use this to gate hover-only enhancements so touch devices get an equivalent
 * always-visible or tap-driven affordance instead of a hover state they can
 * never trigger without an extra first tap.
 */
export function useHoverCapable(): boolean {
  const [capable, setCapable] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    setCapable(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setCapable(e.matches);
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    }
    mql.addListener(onChange);
    return () => mql.removeListener(onChange);
  }, []);

  return capable;
}
