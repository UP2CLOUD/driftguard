"use client";

import { useEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

interface Props {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  threshold?: number;
  once?: boolean;
}

/**
 * Fades + slides up children when scrolled into view.
 * Respects prefers-reduced-motion via CSS (--t-reveal disabled globally).
 */
export function MotionSection({
  children,
  className = "",
  delay = 0,
  threshold = 0.1,
  once = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once]);

  // Reduced motion: render fully shown, no transform/opacity animation.
  if (reduced) {
    return (
      <div ref={ref} className={className}>
        {children}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: visible
          ? `opacity var(--t-reveal, 560ms) var(--ease-out, cubic-bezier(.16,1,.3,1)) ${delay}ms, transform var(--t-reveal, 560ms) var(--ease-out, cubic-bezier(.16,1,.3,1)) ${delay}ms`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
