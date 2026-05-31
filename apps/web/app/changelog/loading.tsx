export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-12 space-y-3">
        <div className="h-2 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-xs rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="space-y-14">
        {Array.from({ length: 3 }).map((_, r) => (
          <div key={r}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-5 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-4 w-12 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
              {Array.from({ length: r === 0 ? 8 : 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 border-b border-[color:var(--dg-border)] last:border-b-0 bg-[color:var(--dg-surface)] px-4 py-3">
                  <div className="h-4 w-8 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
                  <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
