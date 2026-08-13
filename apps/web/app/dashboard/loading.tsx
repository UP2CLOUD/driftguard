export default function Loading() {
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] flex flex-col">
      <nav className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 sm:px-6 py-3.5">
          <div className="h-4 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-8 w-20 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
      </nav>
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
          <div className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2.5">
            <div className="h-2 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
          </div>
          <div className="divide-y divide-[color:var(--dg-border)]">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 rounded bg-[color:var(--dg-border)] animate-pulse" />
                  <div className="h-3 w-28 rounded bg-[color:var(--dg-border)] animate-pulse" />
                </div>
                <div className="h-2 w-12 rounded bg-[color:var(--dg-border)] animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
