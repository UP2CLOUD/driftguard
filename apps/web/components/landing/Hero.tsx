import { LiveTerminal } from "./LiveTerminal";
import Link from "next/link";

export function Hero({ ctaPrimary, ctaSecondary }: { ctaPrimary: React.ReactNode; ctaSecondary?: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b border-[color:var(--dg-border)] dg-grid dg-vignette">
      <div className="dg-grain absolute inset-0" />

      {/* Subtle radial spotlight */}
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[1200px] -translate-x-1/2
        bg-[radial-gradient(closest-side,rgba(63,140,255,0.08),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 py-14 sm:py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:py-28">
        {/* Left: copy */}
        <div className="relative flex flex-col justify-center min-w-0">
          {/* Animated badge — from Gemini template */}
          <div className="mb-6 inline-flex w-fit max-w-full items-center gap-2.5 rounded-full border border-[color:var(--dg-electric)]/20 bg-[color:var(--dg-electric)]/10 px-3.5 py-1.5 backdrop-blur">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--dg-electric)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--dg-electric-bright)]" />
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] truncate">
              v0.1.0-beta live · 14.7k+ Terraform PRs reviewed
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-sans text-[30px] font-semibold leading-[1.08] tracking-[-0.02em] text-[color:var(--dg-fg)] sm:text-[40px] md:text-[48px] lg:text-[56px] break-words">
            Your AI agents write Terraform.{" "}
            <span className="bg-gradient-to-r from-[color:var(--dg-electric)] via-[color:var(--dg-electric-bright)] to-[color:var(--dg-cyan)] bg-clip-text text-transparent">
              We make sure they ship safer.
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-6 text-[14px] sm:text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)] max-w-xl">
            DriftGuard reviews every Terraform &amp; OpenTofu PR — written by humans or AI agents.
            We catch <span className="text-[color:var(--dg-fg)]">cost surprises</span>,{" "}
            <span className="text-[color:var(--dg-fg)]">drift</span>,{" "}
            <span className="text-[color:var(--dg-fg)]">security misconfigs</span>, and{" "}
            <span className="text-[color:var(--dg-fg)]">compliance gaps</span> — and remember every failure
            so your agents stop making the same mistake twice.
          </p>

          {/* Terminal snippet — from Gemini template */}
          <div className="mt-7 flex items-center gap-2 rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-4 py-2.5 w-fit max-w-full">
            <code className="font-mono text-[12px] text-[color:var(--dg-fg-muted)] truncate">
              <span className="text-[color:var(--dg-electric-bright)]"># .github/driftguard.yml</span>
              <span className="mx-3 opacity-30">|</span>
              <span className="text-allowed">policy:</span>
              <span className="ml-1.5 text-[color:var(--dg-fg-subtle)]">block:</span>
              <span className="ml-1.5 text-[color:var(--dg-fg-muted)]">aws_rds.*.delete</span>
            </code>
          </div>

          {/* CTAs */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {ctaPrimary}
            {ctaSecondary}
            <Link href="#architecture" className="font-mono text-[12px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition">
              ▸ how it works
            </Link>
          </div>

          {/* Sub-points */}
          <div className="mt-10 grid grid-cols-3 gap-3 sm:gap-6 border-t border-[color:var(--dg-border)] pt-6">
            <Stat label="P99" value="1.2s" sub="per PR" />
            <Stat label="Memory" value="384‑d" sub="semantic" />
            <Stat label="Compliance" value="DORA" sub="NIS2 · ISO" />
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
