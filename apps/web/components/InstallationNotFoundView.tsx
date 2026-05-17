import Link from "next/link";
import { DriftguardLogo } from "@/components/DriftguardLogo";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

export function InstallationNotFoundView({ installationId }: { installationId?: string }) {
  const githubAppUrl = getGitHubAppInstallUrl();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <nav className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-[var(--dg-space-page-x)] py-3">
          <DriftguardLogo href="/dashboard" />
        </div>
      </nav>
      <div className="flex flex-1 items-center justify-center px-[var(--dg-space-page-x)] py-16">
        <div className="dg-panel max-w-md w-full p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" />
            </svg>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-zinc-100">Installation not found</h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            {installationId ? (
              <>GitHub installation <span className="font-mono text-zinc-300">{installationId}</span> is not linked to DriftGuard yet. Install the app on your organization to start reviews.</>
            ) : (
              <>We don&apos;t have a record of this GitHub App installation yet. Install DriftGuard on your repository to initiate security reviews.</>
            )}
          </p>
          <div className="mt-8 flex flex-col gap-2">
            <Link href="/dashboard" className="inline-flex w-full items-center justify-center rounded-md bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200">Go to my organizations</Link>
            <a href={githubAppUrl} className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-600 hover:bg-zinc-800">Install DriftGuard on GitHub</a>
          </div>
        </div>
      </div>
    </main>
  );
}
