export default function Loading() {
  return (
    <div className="min-h-screen bg-[color:var(--dg-canvas)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-14 space-y-4">
          <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
          <div className="h-9 w-48 rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
          <div className="h-3 w-64 rounded bg-[color:var(--dg-border)] animate-pulse mx-auto" />
        </div>
        <div className="grid gap-4 sm:grid-cols-3 max-w-4xl mx-auto">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 space-y-4">
              <div className="h-4 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-8 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => (
                  <div key={j} className="h-2 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
                ))}
              </div>
              <div className="h-9 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
