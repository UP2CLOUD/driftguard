"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function DashboardInstallationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Dashboard installation error:", error); }, [error]);
  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="flex flex-1 items-center justify-center px-[var(--dg-space-page-x)] py-16">
        <div className="dg-panel max-w-md w-full p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Something went wrong</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">We couldn&apos;t load this dashboard. Try again or return to your organizations.</p>
          <div className="mt-8 flex flex-col gap-2">
            <button type="button" onClick={reset} className="inline-flex w-full items-center justify-center rounded-md bg-orange-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600">Try again</button>
            <Link href="/dashboard" className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800">Go to my organizations</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
