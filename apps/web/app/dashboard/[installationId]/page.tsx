import { Suspense } from "react";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";
import { DemoToggle } from "@/components/DemoToggle";
import { DEMO_OVERVIEW } from "@/lib/demo-data";

import { StatsStripSection } from "./_sections/StatsStrip";
import { RecentAnalysesSection } from "./_sections/RecentAnalyses";
import { IncidentsSection } from "./_sections/Incidents";
import { EventsSection } from "./_sections/Events";
import { ReadinessChecklistSection } from "./_sections/ReadinessChecklist";
import { SeverityBreakdownSection } from "./_sections/SeverityBreakdown";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ installationId: string }>;
}) {
  const session = await auth();
  if (!session) redirect("/");

  const { installationId } = await params;
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);

  const cookieStore = await cookies();
  const demoMode = cookieStore.get("dg_demo")?.value === "1";
  const demoOverview = demoMode ? DEMO_OVERVIEW : undefined;

  return (
    <div className="bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      <div id="main-content" className="mx-auto max-w-[1400px] px-4 sm:px-6 py-10 sm:py-12">
        <DemoToggle active={demoMode} />

        <Suspense fallback={<StatsStripFallback />}>
          <StatsStripSection installationId={installationId} t={t} demoOverview={demoOverview} />
        </Suspense>

        <div className="mt-5">
          <Suspense fallback={null}>
            <SeverityBreakdownSection installationId={installationId} t={t} demoOverview={demoOverview} />
          </Suspense>
        </div>

        {!demoMode && (
          <div className="mt-5">
            <Suspense fallback={null}>
              <ReadinessChecklistSection installationId={installationId} t={t} />
            </Suspense>
          </div>
        )}

        <div className="mt-10 sm:mt-12 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-5 min-w-0">
            <Suspense fallback={<PanelFallback label={t("repos.recentAnalyses") ?? "Recent analyses"} rows={5} />}>
              <RecentAnalysesSection installationId={installationId} t={t} locale={preferences.locale} demoOverview={demoOverview} />
            </Suspense>
            <Suspense fallback={null}>
              <IncidentsSection installationId={installationId} t={t} locale={preferences.locale} />
            </Suspense>
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <Suspense fallback={<PanelFallback label={t("dashboard.eventFeed") ?? "Event feed"} rows={8} />}>
              <EventsSection installationId={installationId} t={t} locale={preferences.locale} demoOverview={demoOverview} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatsStripFallback() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-[color:var(--dg-canvas)] px-4 py-4">
          <div className="h-2 w-16 bg-[color:var(--dg-border)] rounded mb-2 animate-pulse" />
          <div className="h-6 w-12 bg-[color:var(--dg-border)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

function PanelFallback({ label, rows }: { label: string; rows: number }) {
  return (
    <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-3">
        <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
          {label}
        </span>
      </div>
      <div className="divide-y divide-[color:var(--dg-border)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-[color:var(--dg-border)] animate-pulse" />
            <div className="flex-1 h-3 bg-[color:var(--dg-border)] rounded animate-pulse" />
            <div className="h-3 w-12 bg-[color:var(--dg-border)] rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
