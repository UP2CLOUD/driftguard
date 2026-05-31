export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8">
      <div className="h-3 w-20 rounded bg-[color:var(--dg-border)] animate-pulse mb-8" />
      <div className="mb-8 flex flex-wrap items-start gap-4 justify-between">
        <div className="space-y-2">
          <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-7 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-10 w-12 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-7 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
      </div>
      <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[color:var(--dg-canvas)] px-4 py-4 space-y-2">
            <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-6 w-12 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="px-4 py-4 space-y-2">
            <div className="flex gap-2">
              <div className="h-4 w-14 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-4 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-4 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-3 w-3/4 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-2 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
