export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-2 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-72 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-[color:var(--dg-border)] last:border-b-0 px-5 py-4">
            <div className="h-4 w-4 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-2 w-64 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-2 w-6 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
