export default function Loading() {
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[color:var(--dg-canvas)] px-4">
      <div className="fixed inset-0 pointer-events-none z-0 dg-grid dg-grain opacity-50" />
      <div className="fixed inset-0 pointer-events-none z-0 dg-vignette" />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-10 flex justify-center">
          <div className="h-5 w-32 rounded bg-[color:var(--dg-border)] animate-pulse" />
        </div>
        <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color-mix(in_srgb,var(--dg-surface)_60%,transparent)] p-8 space-y-5">
          <div className="h-2 w-24 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-7 w-56 rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-3 w-full rounded bg-[color:var(--dg-border)] animate-pulse" />
          <div className="h-11 w-full rounded bg-[color:var(--dg-border)] animate-pulse mt-2" />
        </div>
      </div>
    </main>
  );
}
