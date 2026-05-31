export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-12 sm:mb-16 border-b border-[color:var(--dg-border)] pb-10 space-y-4">
        <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-80 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="mb-10 h-12 w-full rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] animate-pulse" />
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between border-b border-[color:var(--dg-border)] last:border-b-0 px-4 py-4">
            <div className="h-3 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-4 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
