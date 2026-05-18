import { LiveTerminal } from "./LiveTerminal";
import Link from "next/link";

export function Hero({ ctaPrimary, ctaSecondary }: { ctaPrimary: React.ReactNode; ctaSecondary?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--dg-border)] dg-grid dg-vignette">
      <div className="dg-grain absolute inset-0" />

      {/* Subtle radial spotlight */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[1200px] -translate-x-1/2
        bg-[radial-gradient(closest-side,rgba(63,140,255,0.08),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:py-28">
        {/* Left: copy */}
        <div className="relative flex flex-col justify-center">
          {/* Tag */}
          <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]/60 px-3 py-1 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-allowed dg-pulse text-allowed" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-muted)]">
              Now intercepting 14.7k+ agent actions / day
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-sans text-[44px] font-semibold leading-[1.05] tracking-[-0.02em] text-[color:var(--dg-fg)] sm:text-[52px] lg:text-[58px]">
            Stop AI agents from making the
            <br />
            <span className="relative inline-block">
              <span className="bg-gradient-to-r from-[color:var(--dg-electric)] via-[color:var(--dg-electric-bright)] to-[color:var(--dg-cyan)] bg-clip-text text-transparent">
                same mistake twice.
              </span>
              <span className="absolute -bottom-1 left-0 h-[2px] w-full opacity-50 dg-glow-line" />
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-6 max-w-xl text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)]">
            DriftGuard sits between agent <span className="text-[color:var(--dg-fg)]">intent</span> and{" "}
            <span className="text-[color:var(--dg-fg)]">execution</span>. It remembers failures semantically,
            recalls past incidents in milliseconds, and blocks repeat errors before they ship.
            Production-grade memory and guardrails for autonomous infra agents.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            {ctaPrimary}
            {ctaSecondary}
            <Link href="#architecture" className="font-mono text-[12px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition">
              ▸ how it works
            </Link>
          </div>

          {/* Sub-points */}
          <div className="mt-10 grid grid-cols-3 gap-6 border-t border-[color:var(--dg-border)] pt-6">
            <Stat label="P99 latency" value="1.2s" sub="per intercept" />
            <Stat label="Memory recall" value="384‑d" sub="semantic embed" />
            <Stat label="Frameworks" value="DORA·NIS2" sub="evidence ready" />
          </div>
        </div>

        {/* Right: live terminal */}
        <div className="relative flex items-center">
          <div className="w-full">
            <LiveTerminal />
            {/* Annotation under terminal */}
            <div className="mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              <span>fig 01 ▸ runtime supervisor (live)</span>
              <span>auto‑refresh ▪ 1.4s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[color:var(--dg-border-bright)] to-transparent" />
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="dg-label">{label}</div>
      <div className="mt-1 font-mono text-base font-semibold tabular-nums text-[color:var(--dg-fg)]">{value}</div>
      <div className="text-[10px] text-[color:var(--dg-fg-subtle)] font-mono">{sub}</div>
    </div>
  );
}
