"use client";

import Link from "next/link";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

export function InstallationNotFoundView({ installationId }: { installationId?: string }) {
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <nav className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
            <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          <span className="font-sans text-[15px] font-semibold tracking-tight">driftguard</span>
        </Link>
      </nav>
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="dg-label mb-3">404</div>
        <h1 className="font-sans text-2xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-3">
          Workspace not found
        </h1>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm mb-8">
          This GitHub App installation does not exist or you do not have access to it.
        </p>
        <div className="flex gap-3">
          <a
            href={getGitHubAppInstallUrl()}
            className="dg-button dg-button-primary text-[12px]"
          >
            Install GitHub App →
          </a>
          <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
            My workspaces
          </Link>
        </div>
      </div>
    </main>
  );
}
