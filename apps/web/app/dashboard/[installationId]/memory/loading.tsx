export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-6 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-4">
            <div className="h-2 w-2 rounded-full bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-3/4 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-2 w-1/2 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-3 w-14 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
