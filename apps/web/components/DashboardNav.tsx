"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function DashboardNav({ installationId, planLabel }: { installationId: string; planLabel?: string }) {
  const pathname = usePathname();

  const isSettings = pathname.includes("/settings");
  const isRepos = !isSettings;

  return (
    <nav className="sticky top-0 z-50 border-b border-ink/5 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* Brand Logo with modern design */}
        <Link
          href={`/dashboard/${installationId}`}
          className="group flex items-center gap-2 font-display text-xl font-black tracking-tight text-ink transition-opacity hover:opacity-90"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-accent via-orange-500 to-amber-500 text-white shadow-sm shadow-accent/25">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="bg-gradient-to-r from-ink to-ink/80 bg-clip-text text-transparent">
            driftguard
          </span>
        </Link>

        {/* Dynamic Nav Links with premium active highlights */}
        <div className="flex items-center gap-6 text-sm">
          <Link
            href={`/dashboard/${installationId}`}
            className={`relative font-semibold transition-colors py-1 ${
              isRepos ? "text-accent" : "text-muted hover:text-ink"
            }`}
          >
            Repos
            {isRepos && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent rounded-full animate-fade-in" />
            )}
          </Link>
          <Link
            href={`/dashboard/${installationId}/settings`}
            className={`relative font-semibold transition-colors py-1 ${
              isSettings ? "text-accent" : "text-muted hover:text-ink"
            }`}
          >
            Settings
            {isSettings && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-accent rounded-full animate-fade-in" />
            )}
          </Link>

          {/* Premium subscription badge */}
          {planLabel && (
            <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-[10px] font-black tracking-widest uppercase shadow-sm ${
              planLabel.toLowerCase() === "pro"
                ? "bg-gradient-to-r from-amber-500 via-orange-500 to-accent text-white border-none shadow-orange-500/20"
                : "bg-ink/5 text-ink/70 border border-ink/10"
            }`}>
              {planLabel}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
