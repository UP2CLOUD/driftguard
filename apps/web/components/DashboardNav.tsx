"use client";

import { DriftguardLogo } from "@/components/DriftguardLogo";
import { NavLink } from "@/components/NavButton";
import { NavPreferencesControls } from "@/components/NavPreferencesControls";
import { useT } from "@/components/I18nProvider";
import type { UserPreferences } from "@/lib/preferences/config";
import { usePathname } from "next/navigation";

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
            className={`relative py-0.5 ${isRepos ? "text-orange-400" : ""}`}
          >
            {t("nav.repos")}
            {isRepos && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full rounded-full bg-orange-500" />
            )}
          </NavLink>
          <NavLink
            href={`/dashboard/${installationId}/settings`}
            className={`relative py-0.5 ${isSettings ? "text-orange-400" : ""}`}
          >
            {t("nav.settings")}
            {isSettings && (
              <span className="absolute bottom-[-13px] left-0 h-[2px] w-full rounded-full bg-orange-500" />
            )}
          </NavLink>

          {initialPreferences && (
            <NavPreferencesControls initialPreferences={initialPreferences} />
          )}

          {planLabel && (
            <span
              className={`ms-2 inline-flex items-center rounded border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                planLabel.toLowerCase() === "pro"
                  ? "border-orange-500/20 bg-orange-500/10 text-orange-400"
                  : "border-zinc-700 bg-zinc-800 text-zinc-400"
              }`}
            >
              {planLabel}
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
