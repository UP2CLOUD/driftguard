import Link from "next/link";

export function CtaSection({ cta }: { cta: React.ReactNode }) {
  return (
    <section className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-20 sm:py-28 overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        {/* Glow */}
        <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 h-64 w-[600px] bg-[radial-gradient(closest-side,rgba(63,140,255,0.12),transparent_80%)]" />

        <div className="relative text-center">
          <div className="dg-label mb-4">Ready to ship safer</div>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-6">
            Regain control of your cloud.
          </h2>
          <p className="text-[14px] sm:text-[15px] text-[color:var(--dg-fg-muted)] max-w-xl mx-auto mb-10">
            Install in 30 seconds. No credit card required.
            Works with GitHub, AWS, OpenTofu, and any Terraform-compatible toolchain.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 mb-12">
            {cta}
            <Link
              href="/docs/install"
              className="dg-button dg-button-ghost text-[13px]"
            >
              Read the docs →
            </Link>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            {[
              "EU data residency",
              "SOC 2 Type II Q4 2026",
              "GDPR-native",
              "OpenTofu compatible",
              "No code changes",
            ].map((t) => (
              <span key={t} className="flex items-center gap-2">
                <span className="text-allowed">✓</span>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
