import { getOverview } from "./api";

type T = (key: string) => string | null | undefined;

export async function NavStatusSection({
  installationId,
  t,
}: {
  installationId: string;
  t: T;
}) {
  const overview = await getOverview(installationId);
  const apiAvailable = !!overview;
  const orgPlan = overview?.plan ?? "free";

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hidden sm:inline">
        {orgPlan} plan
      </span>
      {!apiAvailable && (
        <span className="font-mono text-[10px] text-warned bg-warned/10 border border-warned/20 rounded px-2 py-1">
          {t("dashboard.apiOffline") ?? "API offline"}
        </span>
      )}
    </div>
  );
}
