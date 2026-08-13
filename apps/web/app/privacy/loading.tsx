export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <div className="mb-8 h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
      <div className="dg-panel p-6 md:p-8">
        <div className="border-b border-[color:var(--dg-border)] pb-6 space-y-3">
          <div className="h-2 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-8 w-64 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-3 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
        <div className="mt-8 space-y-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2.5">
              <div className="h-4 w-40 rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
              <div className="h-3 w-3/4 rounded bg-[color:var(--dg-border)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
