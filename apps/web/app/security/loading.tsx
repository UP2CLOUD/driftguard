export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-12 space-y-3">
        <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-sm rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-3 bg-[color:var(--dg-surface)]">
            <div className="h-3 w-36 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-3 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
