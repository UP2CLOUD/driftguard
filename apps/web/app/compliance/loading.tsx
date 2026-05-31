export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16">
      <div className="mb-12 space-y-3">
        <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-44 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-md rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 bg-[color:var(--dg-surface-raised)] border-b border-[color:var(--dg-border)]">
              <div className="flex items-center gap-3">
                <div className="h-4 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
                <div className="h-3 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
              </div>
              <div className="h-4 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="p-5 space-y-2">
              <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div key={j} className="h-5 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
