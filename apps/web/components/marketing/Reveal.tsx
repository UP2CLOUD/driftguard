"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import { fadeUp, VIEWPORT_ONCE } from "@/lib/motion/variants";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

type RevealProps = Omit<HTMLMotionProps<"div">, "children"> & {
  children: React.ReactNode;
  /** Extra delay in seconds before this element's own transition starts. */
  delay?: number;
  /** Entrance distance in px. Defaults to the shared mobile-tuned value. */
  distance?: number;
};

/**
 * Viewport-triggered fade-up wrapper — the default entrance for standalone
 * marketing blocks (section headings, standalone cards, CTA blocks).
 *
 * A single IntersectionObserver per instance (via framer-motion's
 * `whileInView`), fires once, and is fully inert under
 * `prefers-reduced-motion` (renders children already in their final state —
 * content is never gated behind motion).
 *
 * For groups of siblings that should stagger together, don't nest multiple
 * `Reveal`s — use a single `motion.*` parent with `staggerContainer()` +
 * `fadeUp()` on each child instead (see RuntimeArchitectureMap/
 * ComplianceHeatmap for the pattern), which uses one observer instead of N.
 */
export function Reveal({ children, delay = 0, distance, className, ...rest }: RevealProps) {
  // SSR-safe: false on the server and on the client's very first render, so
  // hydration never has to reconcile a mismatched initial opacity/transform.
  // Syncs to the real value shortly after mount via an effect.
  const reduceMotion = usePrefersReducedMotion();

  if (reduceMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={VIEWPORT_ONCE}
      variants={fadeUp({ delay, distance })}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
