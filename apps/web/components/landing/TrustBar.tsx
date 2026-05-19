const COMPANIES = [
  "Acme.Corp", "Northwind", "Stripeworks", "Mendel.io", "Voltage", "Apex Labs",
  "Quill", "Pinwheel", "Sigma", "Catalyst", "Foundry", "Helix",
];

export function TrustBar() {
  const items = [...COMPANIES, ...COMPANIES];
  return (
    <section className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-8 sm:py-10">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="dg-label">Reviewing PRs for</div>
          <div className="h-px flex-1 bg-[color:var(--dg-border)]" />
          <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] tabular-nums">
            est. early 2026 cohort
          </div>
        </div>
        <div className="relative overflow-hidden mask-fade">
          <div className="flex gap-12 whitespace-nowrap dg-marquee">
            {items.map((c, i) => (
              <span key={i} className="font-mono text-sm font-semibold tracking-tight text-[color:var(--dg-fg-muted)] opacity-70 hover:opacity-100 transition">
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>
      <style>{`
        .mask-fade {
          mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 10%, black 90%, transparent);
        }
      `}</style>
    </section>
  );
}
