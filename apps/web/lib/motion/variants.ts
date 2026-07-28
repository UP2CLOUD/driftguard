import type { Variants } from "framer-motion";
import { DURATION, DISTANCE, EASE, STAGGER } from "./tokens";

/**
 * Fade + short upward entrance. Distance is intentionally small — this is
 * the workhorse variant for headings, cards, and status rows across the
 * marketing site.
 *
 * `mobile: true` (the default) uses the shorter mobile throw distance;
 * viewport-based CSS/JS split isn't necessary since the distance difference
 * (12px vs 20px) is subtle enough to share across breakpoints without
 * looking wrong on either — callers on desktop-only sections may pass
 * `mobile={false}` for the slightly longer desktop throw.
 */
export function fadeUp(
  opts: { mobile?: boolean; distance?: number; delay?: number } = {}
): Variants {
  const distance = opts.distance ?? (opts.mobile === false ? DISTANCE.desktop : DISTANCE.mobile);
  return {
    hidden: { opacity: 0, y: distance },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: DURATION.reveal, ease: EASE.out, delay: opts.delay ?? 0 },
    },
  };
}

/** Fade + very small scale — for badges, pills, and status indicators. */
export const fadeScale: Variants = {
  hidden: { opacity: 0, scale: 0.97 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: DURATION.reveal, ease: EASE.out },
  },
};

/** Plain fade — for content where any translation would feel unnecessary (footer, fine print). */
export const fadeOnly: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: DURATION.medium, ease: EASE.out } },
};

/**
 * Stagger container — apply to a parent `motion.*` with `initial="hidden"
 * whileInView="visible"`, and give each child variants of `fadeUp()` (or
 * similar) with no individual transition/delay needed; framer-motion
 * propagates the stagger automatically. This replaces per-child
 * IntersectionObservers with a single observer on the parent.
 */
export function staggerContainer(stagger: number = STAGGER.base, delayChildren = 0): Variants {
  return {
    hidden: {},
    visible: {
      transition: { staggerChildren: stagger, delayChildren },
    },
  };
}

/** Standard "animate once, start slightly before fully in view" viewport config. */
export const VIEWPORT_ONCE = { once: true, amount: 0.2, margin: "0px 0px -60px 0px" } as const;
