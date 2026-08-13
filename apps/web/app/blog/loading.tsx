export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-12 space-y-4">
        <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-72 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="space-y-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5 space-y-3">
            <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-5 w-3/4 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
