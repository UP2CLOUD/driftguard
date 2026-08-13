export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-72 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-48 rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="space-y-7">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-3.5 w-52 rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-2.5 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
            <div className="h-2.5 w-5/6 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
