export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-72 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-4 border-b border-[color:var(--dg-border)] last:border-b-0 px-5 py-4">
            <div className="space-y-1.5">
              <div className="h-3 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-2 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
            <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}
