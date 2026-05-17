"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav({ installationId, planLabel }: { installationId: string; planLabel?: string }) {
  const pathname = usePathname();

  const isSettings = pathname.includes("/settings");
  const isRepos = !isSettings;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-canvas/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-[var(--dg-space-page-x)] py-2">
        {/* Brand Logo with modern design */}
        <Link
          href={`/dashboard/${installationId}`}
          className="group flex items-center gap-2 text-base font-bold tracking-tight text-zinc-100 transition-opacity hover:opacity-90"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-zinc-100 font-semibold lowercase">
            driftguard
          </span>
        </Link>

        {/* Dynamic Nav Links with premium active highlights */}
        <div className="flex items-center gap-5 text-sm">
          <Link
            href={`/dashboard/${installationId}`}
            className={`relative font-medium transition-colors py-0.5 text-xs ${
              isRepos ? "text-orange-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Repos
            {isRepos && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full bg-orange-500 rounded-full" />
            )}
          </Link>
          <Link
            href={`/dashboard/${installationId}/settings`}
            className={`relative font-medium transition-colors py-0.5 text-xs ${
              isSettings ? "text-orange-400" : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            Settings
            {isSettings && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full bg-orange-500 rounded-full" />
            )}
          </Link>

          {/* Premium subscription badge */}
          {planLabel && (
            <span className={`inline-flex items-center rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
              planLabel.toLowerCase() === "pro"
                ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
                : "bg-zinc-800 text-zinc-400 border-zinc-700"
            }`}>
              {planLabel}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
