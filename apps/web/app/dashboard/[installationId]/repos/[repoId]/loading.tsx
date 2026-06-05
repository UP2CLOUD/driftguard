export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-8">
      {/* Breadcrumb */}
      <div className="h-2 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="space-y-2">
          <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-5 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-2 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
        <div className="h-4 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-[color:var(--dg-canvas)] px-4 py-4">
            <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse mb-2" />
            <div className="h-6 w-10 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Analyses list */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-10 w-10 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-2 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-4 w-16 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
