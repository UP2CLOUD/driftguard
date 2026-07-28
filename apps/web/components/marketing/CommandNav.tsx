"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { UserPreferences } from "@/lib/preferences/config";
import { useBodyScrollLock } from "@/lib/motion/useBodyScrollLock";
import { useFocusTrap } from "@/lib/motion/useFocusTrap";
import { fadeUp, staggerContainer } from "@/lib/motion/variants";
import { STAGGER, DURATION, EASE } from "@/lib/motion/tokens";
import { usePrefersReducedMotion } from "@/lib/hooks/usePrefersReducedMotion";

// Single source of truth for the marketing nav links.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/#demo", label: "How it works" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#compliance", label: "Compliance" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function CommandNav({ initialPreferences }: { initialPreferences?: UserPreferences }) {
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const reduceMotion = usePrefersReducedMotion();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Scroll-linked motion values, not React state — this never triggers a
  // re-render while scrolling.
  const background = useTransform(scrollY, [0, 50], ["rgba(7, 8, 10, 0)", "rgba(7, 8, 10, 0.85)"]);
  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  useBodyScrollLock(menuOpen);
  useFocusTrap(menuOpen, drawerRef);

  // Close the mobile menu on route change and on Escape.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Close on tap/click outside the nav (covers both the trigger and drawer).
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (drawerRef.current?.contains(target) || menuButtonRef.current?.contains(target)) return;
      setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [menuOpen]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <motion.nav
      style={{ background }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md transition-all duration-300"
    >
      <motion.div
        style={{ opacity: borderOpacity }}
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--dg-border-strong)] to-transparent"
      />

      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-6 h-6" aria-hidden="true">
          <div className="absolute inset-0 border border-[color:var(--dg-electric-bright)] rounded-sm animate-pulse opacity-50" />
          <div className="w-2 h-2 bg-[color:var(--dg-electric)] rounded-sm shadow-[0_0_8px_var(--dg-electric-bright)]" />
        </div>
        <Link href="/" className="font-mono text-[13px] font-medium tracking-[0.2em] text-white flex flex-col">
          <span>DRIFTGUARD</span>
          <span className="text-[8px] text-[color:var(--dg-fg-subtle)] tracking-widest mt-0.5">RUNTIME SAFETY</span>
        </Link>
      </div>

      {/* Desktop nav */}
      <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--dg-fg-subtle)]">
        {NAV_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-white transition-colors relative group">
            <span className="absolute -inset-x-2 -inset-y-1 bg-[color:var(--dg-surface)] opacity-0 group-hover:opacity-100 rounded transition-opacity" />
            <span className="relative">{l.label}</span>
          </Link>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:block">
          <LocaleSwitcher initialPreferences={initialPreferences} compact label="Language" />
        </div>

        <Link
          href="/login"
          className="group relative hidden sm:inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white overflow-hidden rounded bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border-strong)] transition-colors hover:border-[color:var(--dg-electric)] active:scale-[0.97]"
        >
          <div className="absolute inset-0 bg-[color:var(--dg-electric)] opacity-0 group-hover:opacity-10 transition-opacity" />
          <span className="relative flex items-center gap-2">
            Sign in <span className="opacity-50">→</span>
          </span>
        </Link>

        {/* Mobile menu toggle — 44x44 minimum touch target */}
        <button
          ref={menuButtonRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="md:hidden flex flex-col items-center justify-center gap-[5px] w-11 h-11 rounded border border-[color:var(--dg-border-strong)] transition hover:border-[color-mix(in_srgb,var(--dg-electric)_40%,transparent)] active:scale-[0.95]"
        >
          <motion.span
            animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
            transition={{ duration: reduceMotion ? 0 : DURATION.base, ease: EASE.inOut }}
            className="block w-4 h-px origin-center bg-white"
          />
          <motion.span
            animate={{ opacity: menuOpen ? 0 : 1 }}
            transition={{ duration: reduceMotion ? 0 : DURATION.fast }}
            className="block w-4 h-px bg-white"
          />
          <motion.span
            animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
            transition={{ duration: reduceMotion ? 0 : DURATION.base, ease: EASE.inOut }}
            className="block w-4 h-px origin-center bg-white"
          />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            ref={drawerRef}
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            tabIndex={-1}
            initial={reduceMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: reduceMotion ? 0 : DURATION.medium, ease: EASE.out }}
            className="absolute top-full left-0 right-0 md:hidden border-t border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] outline-none"
          >
            <motion.div
              variants={reduceMotion ? undefined : staggerContainer(STAGGER.tight, 0.04)}
              initial={reduceMotion ? undefined : "hidden"}
              animate={reduceMotion ? undefined : "visible"}
              className="flex flex-col px-6 py-4 gap-1 font-mono text-[12px] uppercase tracking-[0.15em] text-[color:var(--dg-fg-muted)]"
            >
              {NAV_LINKS.map((l) => (
                <motion.div key={l.href} variants={reduceMotion ? undefined : fadeUp({ distance: 8 })}>
                  <Link
                    href={l.href}
                    onClick={closeMenu}
                    className="flex min-h-[44px] items-center border-b border-[color:var(--dg-border)] py-2 transition-colors hover:text-white active:text-white"
                  >
                    {l.label}
                  </Link>
                </motion.div>
              ))}

              <motion.div variants={reduceMotion ? undefined : fadeUp({ distance: 8 })}>
                <Link
                  href="/login"
                  onClick={closeMenu}
                  className="mt-3 flex min-h-[44px] items-center gap-2 rounded bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border-strong)] px-4 text-white transition active:scale-[0.98]"
                >
                  Sign in <span className="opacity-50">→</span>
                </Link>
              </motion.div>

              <motion.div
                variants={reduceMotion ? undefined : fadeUp({ distance: 8 })}
                className="mt-3 flex min-h-[44px] items-center justify-between border-t border-[color:var(--dg-border)] pt-3 normal-case tracking-normal"
              >
                <span className="font-sans text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                  Language
                </span>
                <LocaleSwitcher initialPreferences={initialPreferences} label="Language" />
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
