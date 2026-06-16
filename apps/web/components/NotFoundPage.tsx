"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export function NotFoundPage({ hasSession }: { hasSession: boolean }) {
  const t = useT();
  
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col dg-grid dg-vignette">
      <div className="dg-grain absolute inset-0 pointer-events-none" />

      {/* Minimal nav */}
      <nav className="relative z-10 border-b border-[color:var(--dg-border)] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
            <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
          </svg>
          <span className="font-sans text-[15px] font-semibold tracking-tight">driftguard</span>
        </Link>
        {hasSession && (
          <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
            {t("notFound.goDashboard")}
          </Link>
        )}
      </nav>

      {/* Content */}
      <div className="relative flex-1 flex flex-col items-center justify-center text-center px-6 py-20">
        <div className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric)] mb-4">
          {t("notFound.code")}
        </div>
        <h1 className="font-sans text-3xl sm:text-4xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-4">
          {t("notFound.title")}
        </h1>
        <p className="text-[14px] text-[color:var(--dg-fg-muted)] max-w-sm mb-8">
          {t("notFound.description")}
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/" className="dg-button dg-button-primary text-[13px]">
            {t("notFound.backHome")}
          </Link>
          <Link href="/docs" className="dg-button dg-button-ghost text-[13px]">
            {t("nav.docs")}
          </Link>
          {hasSession && (
            <Link href="/dashboard" className="dg-button dg-button-ghost text-[13px]">
              {t("nav.dashboard")}
            </Link>
          )}
        </div>

        {/* Terminal decoration */}
        <div className="mt-16 rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-6 py-4 font-mono text-[12px] text-left max-w-xs w-full">
          <div className="text-[color:var(--dg-fg-subtle)] mb-2">$ driftguard recall --intent missing-page</div>
          <div className="text-[color:var(--dg-fg-muted)]">
            <span className="text-blocked">✗</span> No incidents found for this path.
          </div>
          <div className="text-[color:var(--dg-fg-subtle)] mt-1">
            similarity: 0.00 · confidence: low
          </div>
          {/* eslint-enable react/jsx-no-literals */}
        </div>
      </div>
    </main>
  );
}
