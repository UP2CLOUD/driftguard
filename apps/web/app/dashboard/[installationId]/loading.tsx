export default function Loading() {
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      <nav className="sticky top-0 z-40 border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
            <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="font-sans text-[14px] font-semibold tracking-tight">driftguard</span>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          loading
        </span>
      </nav>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-8">
        <StatsStripSkeleton />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <PanelSkeleton label="Recent analyses" rows={5} />
          </div>
          <PanelSkeleton label="Event feed" rows={8} />
        </div>
      </div>
    </main>
  );
}

function StatsStripSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[color:var(--dg-canvas)] px-4 py-4">
          <div className="h-2 w-16 bg-[color:var(--dg-border)] rounded mb-2 animate-pulse" />
          <div className="h-6 w-12 bg-[color:var(--dg-border)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function PanelSkeleton({ label, rows }: { label: string; rows: number }) {
  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {label}
        </span>
      </div>
      <div className="divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[color:var(--dg-border)] animate-pulse" />
            <div className="flex-1 h-3 bg-[color:var(--dg-border)] rounded animate-pulse" />
            <div className="h-3 w-12 bg-[color:var(--dg-border)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
