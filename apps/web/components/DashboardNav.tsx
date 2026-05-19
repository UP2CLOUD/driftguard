"use client";

import { DriftguardLogo } from "@/components/DriftguardLogo";
import { NavLink } from "@/components/NavButton";
import { NavPreferencesControls } from "@/components/NavPreferencesControls";
import { useT } from "@/components/I18nProvider";
import { signOutToHome } from "@/lib/auth-actions";
import type { UserPreferences } from "@/lib/preferences/config";
import { usePathname } from "next/navigation";

function LogoutButton() {
  return (
    <form action={signOutToHome}>
      <button
        type="submit"
        className="inline-flex items-center gap-1 rounded border border-zinc-800 px-2 py-1 text-[11px] font-medium text-zinc-400 transition hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-200 active:scale-[0.97]"
        title="Sign out"
      >
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
        </svg>
        <span className="hidden sm:inline">Logout</span>
      </button>
    </form>
  );
}

export function DashboardNav({
  installationId,
  planLabel,
  initialPreferences,
}: {
  installationId: string;
  planLabel?: string;
  initialPreferences?: UserPreferences;
}) {
  const pathname = usePathname();
  const t = useT();

  const isSettings = pathname.includes("/settings");
  const isRepos = !isSettings;

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-canvas/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-[var(--dg-space-page-x)] py-2">
        <DriftguardLogo href={`/dashboard/${installationId}`} />

        <div className="flex items-center gap-1 sm:gap-2 text-sm">
          <NavLink
            href={`/dashboard/${installationId}`}
            className={`relative py-0.5 ${isRepos ? "text-[color:var(--dg-electric-bright)]" : ""}`}
          >
            {t("nav.repos")}
            {isRepos && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full rounded-full bg-[color:var(--dg-electric)]" />
            )}
          </NavLink>
          <NavLink
            href={`/dashboard/${installationId}/settings`}
            className={`relative py-0.5 ${isSettings ? "text-[color:var(--dg-electric-bright)]" : ""}`}
          >
            {t("nav.settings")}
            {isSettings && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full rounded-full bg-[color:var(--dg-electric)]" />
            )}
          </NavLink>

          {initialPreferences && (
            <NavPreferencesControls initialPreferences={initialPreferences} />
          )}

          {planLabel && (
            <span
              className={`inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                planLabel.toLowerCase() === "pro"
                  ? "border-[color:var(--dg-electric-dim)] bg-[color:var(--dg-electric-dim)]/30 text-[color:var(--dg-electric-bright)]"
                  : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface-raised)] text-[color:var(--dg-fg-muted)]"
              }`}
            >
              {planLabel}
            </span>
          )}

          <LogoutButton />
        </div>
      </div>
    </nav>
  );
}
