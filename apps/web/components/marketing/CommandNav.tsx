"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useTransform } from "framer-motion";

// Single source of truth for the marketing nav links.
const NAV_LINKS: { href: string; label: string }[] = [
  { href: "/#demo", label: "How it works" },
  { href: "/#architecture", label: "Architecture" },
  { href: "/#compliance", label: "Compliance" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

export function CommandNav() {
  const { scrollY } = useScroll();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const background = useTransform(scrollY, [0, 50], ["rgba(7, 8, 10, 0)", "rgba(7, 8, 10, 0.85)"]);
  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1]);

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
        <Link
          href="/login"
          className="group relative hidden sm:inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white overflow-hidden rounded bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border-strong)] hover:border-[color:var(--dg-electric)] transition-colors"
        >
          <div className="absolute inset-0 bg-[color:var(--dg-electric)] opacity-0 group-hover:opacity-10 transition-opacity" />
          <span className="relative flex items-center gap-2">
            Sign in <span className="opacity-50">→</span>
          </span>
        </Link>

        {/* Mobile menu toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          className="md:hidden flex flex-col items-center justify-center gap-[5px] w-9 h-9 rounded border border-[color:var(--dg-border-strong)] hover:border-[color:var(--dg-electric)]/40 transition"
        >
          <span className={`block w-4 h-px bg-white transition-all origin-center ${menuOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
          <span className={`block w-4 h-px bg-white transition-all ${menuOpen ? "opacity-0" : ""}`} />
          <span className={`block w-4 h-px bg-white transition-all origin-center ${menuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          id="mobile-nav"
          className="absolute top-full left-0 right-0 md:hidden border-t border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)]/95 backdrop-blur-md"
        >
          <div className="flex flex-col px-6 py-4 gap-1 font-mono text-[12px] uppercase tracking-[0.15em] text-[color:var(--dg-fg-muted)]">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 border-b border-[color:var(--dg-border)] hover:text-white transition-colors"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setMenuOpen(false)}
              className="mt-3 inline-flex items-center gap-2 rounded bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border-strong)] px-4 py-3 text-white"
            >
              Sign in <span className="opacity-50">→</span>
            </Link>
          </div>
        </div>
      )}
    </motion.nav>
  );
}
