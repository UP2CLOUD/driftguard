import { cache } from "react";

const API = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const TOKEN = () => `Bearer ${process.env.SECRET_KEY || "dev-only-change-me"}`;

async function _fetch(path: string, revalidate: number) {
  try {
    const res = await fetch(`${API()}${path}`, {
      headers: { Authorization: TOKEN() },
      next: { revalidate },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

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
