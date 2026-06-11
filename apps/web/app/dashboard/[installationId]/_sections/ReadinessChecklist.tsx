import { getOverview } from "./api";
import { ReadinessChecklist } from "@/components/ui/ReadinessChecklist";

type T = (key: string) => string | null | undefined;

export async function ReadinessChecklistSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const overview = await getOverview(installationId);

  const repos = overview?.repos ?? 0;
  // Use recent_analyses (any time) not just 7d window for onboarding check
  const analyses = (overview?.analyses_7d ?? 0) + ((overview?.recent_analyses ?? []).length);
  const incidents = overview?.open_incidents ?? 0;
  const memory = overview?.memory_entries ?? 0;

  const allDone = repos > 0 && analyses > 0 && memory > 0;
  if (allDone) return null;

  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews";
  const installUrl = `https://github.com/apps/${slug}/installations/new`;

  const items = [
    {
      label: t("dashboard.readinessInstallApp") ?? "Install the GitHub App",
      done: repos > 0,
      href: installUrl,
      ctaLabel: t("dashboard.readinessCtaInstall") ?? "Install",
    },
    {
      label: t("dashboard.readinessConnectRepo") ?? "Connect your first repository",
      done: repos > 0,
      href: installUrl,
      ctaLabel: t("dashboard.readinessCtaConnect") ?? "Connect",
    },
    {
      label: t("dashboard.readinessRunAnalysis") ?? "Run your first PR analysis",
      done: analyses > 0,
      href: `/dashboard/${installationId}/repos`,
      ctaLabel: t("dashboard.readinessCtaScan") ?? "Scan",
    },
    {
      label: t("dashboard.readinessDetectIncident") ?? "Detect an incident or finding",
      done: incidents > 0,
    },
    {
      label: t("dashboard.readinessBuildMemory") ?? "Build AI memory from PR decisions",
      done: memory > 0,
      href: `/dashboard/${installationId}/memory`,
      ctaLabel: t("dashboard.readinessCtaViewMemory") ?? "View memory",
    },
  ];

  return <ReadinessChecklist items={items} title={t("dashboard.readinessTitle") ?? "Production readiness"} />;
}
