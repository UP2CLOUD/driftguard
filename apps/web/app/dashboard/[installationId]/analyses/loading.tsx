export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-2 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-6 w-36 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-52 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      {/* Tab skeleton */}
      <div className="flex items-center gap-3 border-b border-[color:var(--dg-border)] pb-3">
        {[40, 88, 68, 88].map((w, i) => (
          <div key={i} className={`h-4 w-${w} rounded bg-[color:var(--dg-border)] animate-pulse`} style={{ width: w }} />
        ))}
      </div>
      {/* Row skeletons */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-10 w-10 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5 min-w-0">
              <div className="h-3 w-2/3 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-2 w-1/3 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="hidden sm:block h-5 w-20 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="hidden sm:block h-3 w-14 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="hidden sm:block h-3 w-20 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
