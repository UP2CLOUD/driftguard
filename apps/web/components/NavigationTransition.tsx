"use client";

import { useT } from "@/components/I18nProvider";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type Variant = "github" | "dashboard" | "generic";

export function NavigationTransition() {
  const t = useT();

  const COPY = useMemo<Record<Variant, { title: string; lines: string[] }>>(() => ({
    github: {
      title: t("landing.navTransition.github.title"),
      lines: [
        `› ${t("landing.navTransition.github.line1", { domain: "oauth.github.com" })}`,
        `› ${t("landing.navTransition.github.line2")}`,
        `› ${t("landing.navTransition.github.line3", { domain: "github.com" })}`,
      ],
    },
    dashboard: {
      title: t("landing.navTransition.dashboard.title"),
      lines: [
        `› ${t("landing.navTransition.dashboard.line1")}`,
        `› ${t("landing.navTransition.dashboard.line2")}`,
        `› ${t("landing.navTransition.dashboard.line3")}`,
      ],
    },
    generic: {
      title: t("landing.navTransition.generic.title"),
      lines: [
        `› ${t("landing.navTransition.generic.line1")}`,
        `› ${t("landing.navTransition.generic.line2")}`,
        `› ${t("landing.navTransition.generic.line3")}`,
      ],
    },
  }), [t]);

  const [variant, setVariant] = useState<Variant | null>(null);
  const [visibleLines, setVisibleLines] = useState(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pathname = usePathname();

  const clearTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  // Hide on route change
  useEffect(() => {
    setVariant(null);
    setVisibleLines(0);
    clearTimers();
  }, [pathname]);

  // Hide on bfcache restore (back/forward navigation)
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setVariant(null);
        clearTimers();
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Click delegation — instant overlay, no nav interception
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-transition]"
      );
      if (!el) return;

      const v = (el.dataset.transition as Variant) || "generic";
      setVariant(v);
      setVisibleLines(0);

      // Stagger reveal of boot lines
      const copy = COPY[v];
      copy.lines.forEach((_, i) => {
        timersRef.current.push(
          setTimeout(() => setVisibleLines((n) => Math.max(n, i + 1)), 180 + i * 220)
        );
      });

      // Safety: auto-dismiss if nav never happens
      timersRef.current.push(setTimeout(() => setVariant(null), 9000));
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [COPY]);

  // ESC dismiss
  useEffect(() => {
    if (!variant) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVariant(null);
        clearTimers();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [variant]);

  if (!variant) return null;

  const copy = COPY[variant];

  return (
    <div
      aria-live="polite"
      aria-label={copy.title}
      className="dg-nav-transition fixed inset-0 z-[100] flex items-center justify-center"
      data-variant={variant}
    >
      <div className="dg-nav-transition__backdrop absolute inset-0" />
      <div className="dg-nav-transition__grid absolute inset-0" />
      <div className="dg-nav-transition__scan absolute inset-x-0 h-px" />

      <div className="relative flex flex-col items-center gap-6 px-6 text-center max-w-md">
        {/* Logo with pulse */}
        <div className="dg-nav-transition__logo relative">
          <svg
            width="44"
            height="44"
            viewBox="0 0 20 20"
            fill="none"
            className="relative z-10"
          >
            <path
              d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z"
              stroke="#3F8CFF"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
            <path
              d="M10 7 L10 17"
              stroke="#3F8CFF"
              strokeWidth="1.4"
              strokeOpacity="0.4"
              strokeLinecap="round"
            />
          </svg>
          <div className="dg-nav-transition__halo absolute inset-0" />
        </div>

        {/* Title */}
        <div className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-[color:var(--dg-fg-subtle)]">
            driftguard · runtime
          </p>
          <p className="font-sans text-[15px] font-medium text-[color:var(--dg-fg)]">
            {copy.title}
            <span className="dg-nav-transition__dots" aria-hidden>
              <span>.</span>
              <span>.</span>
              <span>.</span>
            </span>
          </p>
        </div>

        {/* Boot log */}
        <ul className="w-full space-y-1.5 font-mono text-[11px] text-left">
          {copy.lines.map((line, i) => (
            <li
              key={line}
              className={`dg-nav-transition__line ${
                i < visibleLines ? "dg-nav-transition__line--on" : ""
              }`}
            >
              <span className="text-[color:var(--dg-fg-subtle)] mr-2 tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[color:var(--dg-electric)]">{line}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
