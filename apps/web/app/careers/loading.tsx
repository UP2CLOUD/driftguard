export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-12 space-y-3">
        <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-xs rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-14">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[color:var(--dg-canvas)] px-5 py-5 space-y-2">
            <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[color:var(--dg-border)]">
              <div className="space-y-2">
                <div className="h-4 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
                <div className="h-2 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
              </div>
              <div className="h-8 w-20 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
