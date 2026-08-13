export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 sm:py-16">
      <div className="mb-10 space-y-4">
        <div className="h-2 w-16 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-9 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
        <div className="h-3 w-full max-w-md rounded bg-[color:var(--dg-border)] animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" style={{ maxWidth: i % 3 === 2 ? "70%" : "100%" }} />
        ))}
      </div>
    </div>
  );
}
