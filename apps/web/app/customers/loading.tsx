export default function Loading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-16">
      <div className="mb-12 space-y-3">
        <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-7 w-64 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-sm rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] mb-16">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-[color:var(--dg-canvas)] px-5 py-6 flex flex-col items-center gap-2">
            <div className="h-8 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-6 space-y-3">
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-5/6 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-4/6 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-3 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
