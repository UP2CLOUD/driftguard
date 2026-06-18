import { cache } from "react";
import { beGet, beGetFull } from "@/lib/backend";

const _fetch = (path: string, revalidate: number): Promise<any> =>
  beGet<any>(path, { revalidate, timeout: 25000 });

// React.cache dedupes calls within a single render pass.
// getOverviewFull exposes the HTTP status so components can distinguish
// auth failures (401) from genuine missing orgs.
export const getOverviewFull = cache(
  (installationId: string) =>
    beGetFull<any>(`/api/v1/dashboard/overview?installation_id=${installationId}`, {
      revalidate: 20,
      timeout: 25000,
    })
);

export const getOverview = cache(
  (installationId: string) => getOverviewFull(installationId).then((r) => r.data)
);

export const getPlan = cache(
  (installationId: string) =>
    _fetch(`/api/v1/billing/plan?installation_id=${installationId}`, 60)
);

export const getIncidents = cache(
  (installationId: string) =>
    _fetch(`/api/v1/incidents?installation_id=${installationId}&limit=5`, 20)
);

export const getEvents = cache(
  (installationId: string) =>
    _fetch(`/api/v1/events?installation_id=${installationId}&limit=8`, 10)
);

export const getOrgAnalyses = cache(
  async (installationId: string, limit = 30): Promise<any[]> => {
    const org = await beGet<{ id: string }>(
      `/api/v1/orgs/by-installation/${installationId}`,
      { revalidate: 60, timeout: 5000 },
    );
    if (!org?.id) return [];
    return (
      (await beGet<any[]>(
        `/api/v1/orgs/${org.id}/analyses?limit=${limit}&status=completed`,
        { revalidate: 30, timeout: 8000 },
      )) ?? []
    );
  }
);
