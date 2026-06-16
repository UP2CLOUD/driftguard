import { getOverviewFull } from "./api";
import { ReadinessChecklist } from "@/components/ui/ReadinessChecklist";
import { getGitHubAppInstallUrl } from "@/lib/github-app";

type T = (key: string) => string | null | undefined;

export async function ReadinessChecklistSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const { data: overview, status: backendStatus } = await getOverviewFull(installationId);

  const repos = overview?.repos ?? 0;
  // Use recent_analyses (any time) not just 7d window for onboarding check
  const analyses = (overview?.analyses_7d ?? 0) + ((overview?.recent_analyses ?? []).length);
  const incidents = overview?.open_incidents ?? 0;
  const memory = overview?.memory_entries ?? 0;

  // Distinguish backend failures from a genuine "new user" state.
  // When the backend returns 401 or is unreachable, showing "Install the GitHub App"
  // is misleading — surface the real problem instead.
  if (backendStatus === 401) {
    return (
      <div className="rounded-md border border-warned/30 bg-warned/5 px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-warned">⚠</span>
        <div className="font-mono text-[12px] text-warned leading-relaxed">
          <span className="font-bold">Backend authentication error (HTTP 401).</span>{" "}
          The API rejected the request — verify that{" "}
          <span className="text-[color:var(--dg-fg)]">SECRET_KEY</span> in your Vercel
          environment matches the value set on the backend (Render).
        </div>
      </div>
    );
  }

  if (backendStatus === null) {
    return (
      <div className="rounded-md border border-warned/30 bg-warned/5 px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-warned">⚠</span>
        <div className="font-mono text-[12px] text-warned leading-relaxed">
          <span className="font-bold">Backend unreachable.</span>{" "}
          Could not connect to the API. Verify that{" "}
          <span className="text-[color:var(--dg-fg)]">NEXT_PUBLIC_API_URL</span> in Vercel
          points to the correct backend URL.
        </div>
      </div>
    );
  }

  if (backendStatus !== null && backendStatus >= 500) {
    return (
      <div className="rounded-md border border-warned/30 bg-warned/5 px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-warned">⚠</span>
        <div className="font-mono text-[12px] text-warned leading-relaxed">
          <span className="font-bold">Backend error (HTTP {backendStatus}).</span>{" "}
          The API returned a server error. Dashboard data may be incomplete.
        </div>
      </div>
    );
  }

  const allDone = repos > 0 && analyses > 0;
  if (allDone) {
    return (
      <div className="rounded-md border border-allowed/30 bg-allowed/5 px-4 py-3 flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-allowed text-[14px] leading-none">✓</span>
        <div className="font-mono text-[12px] text-[color:var(--dg-fg-muted)] leading-relaxed">
          <span className="font-bold text-allowed">Setup complete.</span>{" "}
          {t("dashboard.readinessDone") ??
            "DriftGuard is active. Open a Terraform pull request in a connected repository to trigger your next review."}
        </div>
      </div>
    );
  }

  const installUrl = getGitHubAppInstallUrl();

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
