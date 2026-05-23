"use client";

import { useT } from "@/components/TranslationProvider";

import { LiveTerminal } from "./LiveTerminal";
import Link from "next/link";

export function Hero({
  ctaPrimary,
  ctaSecondary,
}: {
  ctaPrimary: React.ReactNode;
  ctaSecondary?: React.ReactNode;
}) {
  const t = useT();
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--dg-border)] dg-grid dg-vignette">
      <div className="dg-grain absolute inset-0 pointer-events-none" />

      {/* Spotlight — contained by overflow-hidden */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2
          bg-[radial-gradient(closest-side,rgba(63,140,255,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 py-14 sm:py-20
        lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:py-28">

        {/* ── Left: copy ─────────────────────────────────────── */}
        <div className="relative flex flex-col justify-center min-w-0 w-full">

          {/* Badge */}
          <div className="mb-6 inline-flex w-fit max-w-full items-center gap-2.5 rounded-full
            border border-[color:var(--dg-electric)]/20 bg-[color:var(--dg-electric)]/10
            px-3.5 py-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--dg-electric)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--dg-electric-bright)]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] truncate">
              v0.1.0-beta · Now in early access
            </span>
          </div>

          {/* Headline — each line explicit to prevent inline gradient overflow */}
          <h1 className="font-sans font-semibold leading-[1.1] tracking-[-0.02em] text-[color:var(--dg-fg)]
            text-[28px] sm:text-[38px] md:text-[46px] lg:text-[54px]">
            <span className="block">{t("landing.hero.line1")}</span>
            <span className="block bg-gradient-to-r from-[color:var(--dg-electric)] via-[color:var(--dg-electric-bright)] to-[color:var(--dg-cyan)] bg-clip-text text-transparent">
              We make sure they ship safer.
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-5 text-[13px] sm:text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)]">
            DriftGuard reviews every Terraform &amp; OpenTofu PR — written by humans or AI agents.
            We catch{" "}
            <span className="text-[color:var(--dg-fg)]">cost surprises</span>,{" "}
            <span className="text-[color:var(--dg-fg)]">drift</span>,{" "}
            <span className="text-[color:var(--dg-fg)]">security misconfigs</span>, and{" "}
            <span className="text-[color:var(--dg-fg)]">compliance gaps</span>{" "}
            — and remember every failure so your agents stop making the same mistake twice.
          </p>

          {/* Terminal snippet — hidden on smallest screens, visible sm+ */}
          <div className="mt-6 hidden xs:flex sm:flex items-center gap-2 rounded-lg border
            border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2.5
            w-fit max-w-full overflow-hidden">
            <code className="font-mono text-[10px] sm:text-[11px] text-[color:var(--dg-fg-muted)] truncate min-w-0 block">
              <span className="text-[color:var(--dg-electric-bright)]"># driftguard.yml</span>
              <span className="mx-2 opacity-30">|</span>
              <span className="text-allowed">block:</span>
              <span className="ml-1 text-[color:var(--dg-fg-muted)]">aws_rds.*.delete</span>
            </code>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {ctaPrimary}
            {ctaSecondary}
            <Link
              href="/#architecture"
              className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              ▸ how it works
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-6 border-t border-[color:var(--dg-border)] pt-6">
            <Stat label="P99" value="&lt;2s" sub="review time" />
            <Stat label="Memory" value="384‑d" sub="semantic" />
            <Stat label="Compliance" value="DORA" sub="NIS2 · ISO" />
          </div>
        </div>

        {/* ── Right: live terminal (hidden on mobile, shown lg+) ─ */}
        <div className="relative hidden lg:flex items-center">
          <div className="w-full">
            <LiveTerminal />
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              <span>fig 01 ▸ runtime supervisor (live)</span>
              <span>auto‑refresh ▪ 1.4s</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="dg-label truncate">{label}</div>
      <div
        className="mt-1 font-mono text-[18px] sm:text-xl font-semibold tabular-nums text-[color:var(--dg-fg)] leading-tight"
        dangerouslySetInnerHTML={{ __html: value }}
      />
      <div className="mt-0.5 text-[9px] sm:text-[10px] text-[color:var(--dg-fg-subtle)] font-mono truncate">{sub}</div>
    </div>
  );
}
