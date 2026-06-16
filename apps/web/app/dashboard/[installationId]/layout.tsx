import { auth } from "@/auth";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { DashboardNav } from "@/components/DashboardNav";
import { DashboardFooter } from "@/components/DashboardFooter";
import { UpgradeIntent } from "@/components/UpgradeIntent";
import { SetInstallationCookie } from "@/components/SetInstallationCookie";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { checkInstallationAccess } from "@/lib/auth-utils";
import { beGet } from "@/lib/backend";

async function fetchOpenIncidents(installationId: string): Promise<number> {
  const data = await beGet<unknown[]>(
    `/api/v1/incidents?installation_id=${installationId}&status=open&limit=100`,
    { revalidate: 30, timeout: 2000 },
  );
  return Array.isArray(data) ? data.length : 0;
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;

  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const { authorized, installations } = await checkInstallationAccess(installationId);
  if (!authorized) redirect("/");

  const installation = installations.find((i) => i.id === parseInt(installationId));
  const planLabel = undefined; // fetched per-page for accuracy

  const openIncidents = await fetchOpenIncidents(installationId);

  return (
    <div className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] flex flex-col">
      <DashboardNav
        installationId={installationId}
        planLabel={planLabel}
        openIncidents={openIncidents}
        labels={{
          overview:            t("nav.overview")              ?? "Overview",
          docs:                t("nav.docs")                  ?? "Docs",
          repos:               t("nav.repos")                 ?? "Repos",
          analyses:            t("nav.analyses")              ?? "Analyses",
          incidents:           t("nav.incidents")             ?? "Incidents",
          policies:            t("nav.policies")              ?? "Policies",
          memory:              t("nav.memory")                ?? "Memory",
          auditLog:            t("nav.auditLog")              ?? "Audit log",
          settings:            t("nav.settings")              ?? "Settings",
          skipToMainContent:   t("common.skipToMainContent")  ?? "Skip to main content",
          openCommandPalette:  t("nav.openCommandPalette")    ?? "Open command palette",
          toggleMenu:          t("nav.toggleMenu")            ?? "Toggle menu",
        }}
      />
      <SetInstallationCookie installationId={installationId} />
      <main className="flex-1">
        <Suspense fallback={null}>
          <UpgradeIntent installationId={installationId} />
        </Suspense>
        {children}
      </main>
      <DashboardFooter />
    </div>
  );
}
