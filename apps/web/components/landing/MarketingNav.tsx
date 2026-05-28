"use client";

import { useT } from "@/components/TranslationProvider";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { UserPreferences } from "@/lib/preferences/config";
import Link from "next/link";
import { useState, useEffect } from "react";

export function MarketingNav({
  isLoggedIn,
  cta,
  initialPreferences,
}: {
  isLoggedIn?: boolean;
  cta?: React.ReactNode;
  initialPreferences?: UserPreferences;
}) {
  const t = useT();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  // Build links inside component so t() is in scope
  const LINKS = [
    { href: "/#product",      label: t("nav.product") },
    { href: "/#architecture", label: t("nav.architecture") },
    { href: "/#integrate",    label: t("nav.integrate") },
    { href: "/#pricing",      label: t("nav.pricing") },
    { href: "/docs",          label: t("nav.docs") },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${
        scrolled
          ? "border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3.5">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
                <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
                <circle cx="10" cy="3" r="0.8" fill="currentColor" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-1 w-1 rounded-full bg-allowed dg-pulse" />
            </div>
            <span className="font-sans text-[15px] font-semibold tracking-tight text-[color:var(--dg-fg)]">
              driftguard
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-7 text-[13px] text-[color:var(--dg-fg-muted)]">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-[color:var(--dg-fg)] transition">
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* GitHub star */}
          <a
            href="https://github.com/UP2CLOUD/driftguard"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 .2a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 008 .2z" />
            </svg>
            <span className="tabular-nums">★</span>
          </a>

          {isLoggedIn ? (
            <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px] sm:text-[13px]">
              {t("landing.nav.dashboard")}
            </Link>
          ) : (
            cta
          )}

          <LocaleSwitcher initialPreferences={initialPreferences} compact label={t("common.language")} />

          {/* Hamburger */}
          <button
            onClick={() => setOpen(!open)}
            aria-label={t("nav.menuLabel")}
            className="md:hidden flex flex-col items-center justify-center gap-1 p-2 -mr-2"
          >
            <span className={`h-px w-4 bg-[color:var(--dg-fg)] transition-transform duration-200 ${open ? "translate-y-[3px] rotate-45" : ""}`} />
            <span className={`h-px w-4 bg-[color:var(--dg-fg)] transition-transform duration-200 ${open ? "-translate-y-[3px] -rotate-45" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/95 backdrop-blur">
          <div className="flex flex-col px-4 py-3 text-[14px]">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2.5 text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition border-b border-[color:var(--dg-border)] last:border-b-0"
              >
                {l.label}
              </Link>
            ))}
            <div className="py-2.5 flex items-center gap-2 text-[color:var(--dg-fg-muted)]">
              <span className="text-[12px]">{t("common.language")}</span>
              <LocaleSwitcher initialPreferences={initialPreferences} label={t("common.language")} />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
