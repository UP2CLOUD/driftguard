import { getOverview } from "./api";
import { ReadinessChecklist } from "@/components/ui/ReadinessChecklist";

type T = (key: string) => string | null | undefined;

export async function ReadinessChecklistSection({
  installationId,
  t: _t,
}: {
  installationId: string;
  t: T;
}) {
  const overview = await getOverview(installationId);

  const repos = overview?.repos ?? 0;
  const analyses = overview?.analyses_7d ?? 0;
  const incidents = overview?.open_incidents ?? 0;
  const memory = overview?.memory_entries ?? 0;

  // Only show when user hasn't completed onboarding
  if (repos > 0 && analyses > 0) return null;

  const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews";
  const installUrl = `https://github.com/apps/${slug}/installations/new`;

  const items = [
    {
      label: "Install the GitHub App",
      done: repos > 0,
      href: installUrl,
      ctaLabel: "Install",
    },
    {
      label: "Connect your first repository",
      done: repos > 0,
      href: installUrl,
      ctaLabel: "Connect",
    },
    {
      label: "Run your first PR analysis",
      done: analyses > 0,
      href: `/dashboard/${installationId}/repos`,
      ctaLabel: "Scan",
    },
    {
      label: "Detect an incident or finding",
      done: incidents > 0,
    },
    {
      label: "Build AI memory from PR decisions",
      done: memory > 0,
      href: `/dashboard/${installationId}/memory`,
      ctaLabel: "View memory",
    },
  ];

  return <ReadinessChecklist items={items} title="Production readiness" />;
}
