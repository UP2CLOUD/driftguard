export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8 sm:py-12 space-y-14">
      <div className="space-y-2">
        <div className="h-2 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-4">
          <div className="space-y-1">
            <div className="h-4 w-36 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-3 w-64 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
          <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
            {Array.from({ length: i === 2 ? 3 : 2 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-3">
                <div className="h-3 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
                <div className="h-3 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
