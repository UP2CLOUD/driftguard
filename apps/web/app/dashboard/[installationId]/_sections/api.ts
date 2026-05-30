import { cache } from "react";
import { beGet } from "@/lib/backend";

const _fetch = (path: string, revalidate: number) =>
  beGet(path, { revalidate, timeout: 8000 });

// React.cache dedupes calls within a single render pass —
// OverviewSection + RecentAnalysesSection partilham o mesmo fetch.
export const getOverview = cache(
  (installationId: string) =>
    _fetch(`/api/v1/dashboard/overview?installation_id=${installationId}`, 20)
);

export const getIncidents = cache(
  (installationId: string) =>
    _fetch(`/api/v1/incidents?installation_id=${installationId}&limit=5`, 20)
);

export const getEvents = cache(
  (installationId: string) =>
    _fetch(`/api/v1/events?installation_id=${installationId}&limit=8`, 10)
);
