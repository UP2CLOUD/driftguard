"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutToHome } from "@/lib/auth-actions";
import { CommandPalette } from "@/components/CommandPalette";

export function DashboardNav({
  installationId,
  planLabel,
  openIncidents = 0,
  labels = {},
}: {
  installationId: string;
  planLabel?: string;
  openIncidents?: number;
  labels?: Record<string, string>;
}) {
  const l = (key: string, fallback: string) => labels[key] ?? fallback;
  const pathname = usePathname();
  const base = `/dashboard/${installationId}`;
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const navItems = [
    { label: l("overview", "Overview"),   href: base },
    { label: l("repos", "Repos"),         href: `${base}/repos` },
    { label: l("analyses", "Analyses"),   href: `${base}/analyses` },
    { label: l("finops", "FinOps"),       href: `${base}/finops` },
    { label: l("incidents", "Incidents"), href: `${base}/incidents`, badge: openIncidents > 0 ? openIncidents : 0 },
    { label: l("policies", "Policies"),   href: `${base}/policies` },
    { label: l("memory", "Memory"),       href: `${base}/memory` },
    { label: l("auditLog", "Audit log"),  href: `${base}/audit-log` },
    { label: l("settings", "Settings"),   href: `${base}/settings` },
  ];

  return (
    <>
      <CommandPalette
        installationId={installationId}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />

      {/* Skip link — visible on keyboard focus only */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:border focus:border-[color:var(--dg-electric)] focus:bg-[color:var(--dg-canvas)] focus:px-3 focus:py-2 focus:font-mono focus:text-[12px] focus:text-[color:var(--dg-fg)] focus:shadow-md"
      >
        {l("skipToMainContent", "Skip to main content")}
      </a>

      <nav className="sticky top-0 z-40 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-5">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
                <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
              </svg>
              <span className="font-sans text-[13px] font-semibold tracking-tight text-[color:var(--dg-fg)] hidden sm:inline">
                driftguard
              </span>
            </Link>

            {/* Desktop nav items — 8 items need real width, so collapse to the
                hamburger below lg rather than cramming them onto tablets. */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navItems.map((item) => {
                const isActive =
                  item.href === base
                    ? pathname === base
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-1.5 px-2.5 py-1.5 font-sans font-semibold text-[11px] uppercase tracking-wide transition rounded ${
                      isActive
                        ? "text-[color:var(--dg-fg)]"
                        : "text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)]"
                    }`}
                  >
                    {item.label}
                    {isActive && (
                      <span className="absolute bottom-0 inset-x-2.5 h-0.5 bg-[color:var(--dg-electric)] rounded-full" />
                    )}
                    {item.badge ? (
                      <span className="rounded bg-blocked/20 px-1 font-sans font-medium text-[10px] text-blocked">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-2 sm:gap-3">
            {planLabel && (
              <span className="hidden lg:inline rounded border border-[color:var(--dg-border)] px-2 py-0.5 font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
                {planLabel}
              </span>
            )}
            <Link
              href="/docs"
              className="hidden lg:inline font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              {l("docs", "Docs")}
            </Link>
            {/* Command palette trigger */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="hidden lg:flex items-center gap-1.5 rounded border border-[color:var(--dg-border)] px-2 py-1 font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
              aria-label={l("openCommandPalette", "Open command palette")}
            >
              <span>⌘K</span>
            </button>
            <form action={signOutToHome} className="hidden lg:block">
              <button type="submit" className="dg-button dg-button-ghost text-[11px] py-1.5 gap-1.5">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                <span>{l("signOut", "Sign out")}</span>
              </button>
            </form>

            {/* Mobile / tablet hamburger */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden flex flex-col items-center justify-center gap-[5px] w-9 h-9 rounded border border-[color:var(--dg-border)] hover:border-[color:var(--dg-electric)]/40 transition"
              aria-label={l("toggleMenu", "Toggle menu")}
              aria-expanded={menuOpen}
            >
              <span className={`block w-4 h-px bg-[color:var(--dg-fg-muted)] transition-all origin-center ${menuOpen ? "rotate-45 translate-y-[6px]" : ""}`} />
              <span className={`block w-4 h-px bg-[color:var(--dg-fg-muted)] transition-all ${menuOpen ? "opacity-0 scale-x-0" : ""}`} />
              <span className={`block w-4 h-px bg-[color:var(--dg-fg-muted)] transition-all origin-center ${menuOpen ? "-rotate-45 -translate-y-[6px]" : ""}`} />
            </button>
          </div>
        </div>

        {/* Mobile / tablet drawer */}
        {menuOpen && (
          <div className="lg:hidden border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-4 py-3">
            <div className="space-y-0.5 mb-4">
              {navItems.map((item) => {
                const isActive =
                  item.href === base
                    ? pathname === base
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2.5 rounded font-mono text-[12px] uppercase tracking-wider transition ${
                      isActive
                        ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)]"
                        : "text-[color:var(--dg-fg-muted)] hover:bg-[color:var(--dg-surface)] hover:text-[color:var(--dg-fg)]"
                    }`}
                  >
                    <span>{item.label}</span>
                    <div className="flex items-center gap-2">
                      {item.badge ? (
                        <span className="rounded bg-blocked/20 px-1.5 py-0.5 font-sans font-medium text-[10px] text-blocked">
                          {item.badge}
                        </span>
                      ) : null}
                      {isActive && (
                        <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--dg-electric)]" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Mobile bottom actions */}
            <div className="flex items-center justify-between pt-3 border-t border-[color:var(--dg-border)]">
              <Link
                href="/docs"
                className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
              >
                {l("docs", "Docs")}
              </Link>
              <form action={signOutToHome}>
                <button type="submit" className="flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  {l("signOut", "Sign out")}
                </button>
              </form>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
