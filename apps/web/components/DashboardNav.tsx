"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutToHome } from "@/lib/auth-actions";

export function DashboardNav({
  installationId,
  planLabel,
}: {
  installationId: string;
  planLabel?: string;
}) {
  const pathname = usePathname();

  const navItems = [
    { label: "Repos", href: `/dashboard/${installationId}` },
    { label: "Settings", href: `/dashboard/${installationId}/settings` },
  ];

  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
              <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
            </svg>
            <span className="font-sans text-[14px] font-semibold tracking-tight text-[color:var(--dg-fg)]">
              driftguard
            </span>
          </Link>

          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive =
                item.href === `/dashboard/${installationId}`
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded px-2.5 py-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                    isActive
                      ? "bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg)]"
                      : "text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Right: plan badge + docs + sign out */}
        <div className="flex items-center gap-3">
          {planLabel && (
            <span className="hidden sm:inline rounded border border-[color:var(--dg-border)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              {planLabel}
            </span>
          )}
          <Link
            href="/docs"
            className="hidden sm:inline font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
          >
            Docs
          </Link>
          <form action={signOutToHome}>
            <button
              type="submit"
              className="dg-button dg-button-ghost text-[11px] py-1.5"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
              </svg>
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </form>
        </div>
      </div>
    </nav>
  );
}
