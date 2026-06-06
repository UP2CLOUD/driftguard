export default function IncidentDetailLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-8 animate-pulse">
      <div className="h-3 w-24 bg-[color:var(--dg-surface-raised)] rounded mb-8" />
      <div className="mb-8 space-y-2">
        <div className="h-2.5 w-16 bg-[color:var(--dg-surface-raised)] rounded" />
        <div className="flex gap-2">
          <div className="h-4 w-16 bg-[color:var(--dg-surface-raised)] rounded" />
          <div className="h-4 w-20 bg-[color:var(--dg-surface-raised)] rounded" />
        </div>
        <div className="h-7 w-80 bg-[color:var(--dg-surface-raised)] rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4 space-y-2">
              <div className="h-2.5 w-24 bg-[color:var(--dg-surface-raised)] rounded" />
              <div className="h-3 w-full bg-[color:var(--dg-surface-raised)] rounded" />
              <div className="h-3 w-3/4 bg-[color:var(--dg-surface-raised)] rounded" />
            </div>
          ))}
        </div>
        <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-4 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <div className="h-2 w-16 bg-[color:var(--dg-surface-raised)] rounded mb-1" />
              <div className="h-3 w-32 bg-[color:var(--dg-surface-raised)] rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
