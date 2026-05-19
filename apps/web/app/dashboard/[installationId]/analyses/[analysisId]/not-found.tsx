import Link from "next/link";

export default function AnalysisNotFound() {
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <div className="flex flex-1 items-center justify-center px-[var(--dg-space-page-x)] py-16">
        <div className="dg-panel max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[color:var(--dg-fg)]">Analysis not found</h1>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--dg-fg-muted)]">This analysis does not exist or is no longer available.</p>
          <Link href="/dashboard" className="mt-8 inline-flex w-full items-center justify-center rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">Back to dashboard</Link>
        </div>
      </div>
    </main>
  );
}
