const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_SECRET = process.env.INTERNAL_API_SECRET || process.env.SECRET_KEY || "dev-only-change-me";

export type Org = {
  id: string;
  installation_id: number;
  plan: string;
  has_stripe_customer: boolean;
};

export type Repo = {
  id: string;
  full_name: string;
  default_branch: string;
  enabled: boolean;
};

export type AnalysisListItem = {
  id: string;
  status: string;
  cost_delta_cents: number | null;
  risk_score: number | null;
  pr_number: number;
  head_sha: string;
  repo: string;
};

export type Finding = {
  type: string;
  severity: string;
  resource: string;
  message: string;
  suggestion: string | null;
};

export type Analysis = {
  id: string;
  status: string;
  cost_delta_cents: number | null;
  risk_score: number | null;
  summary_md: string | null;
  findings: Finding[];
};

async function get<T>(path: string): Promise<T> {
  const headers: HeadersInit = {};
  if (typeof window === "undefined") {
    headers["Authorization"] = `Bearer ${API_SECRET}`;
  }
  const r = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers,
  });
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

export async function getOrg(installationId: string): Promise<Org> {
  return get<Org>(`/api/v1/orgs/by-installation/${installationId}`);
}

export async function listRepos(orgId: string): Promise<Repo[]> {
  return get<Repo[]>(`/api/v1/orgs/${orgId}/repos`);
}

export async function listAnalyses(orgId: string, limit = 20): Promise<AnalysisListItem[]> {
  return get<AnalysisListItem[]>(`/api/v1/orgs/${orgId}/analyses?limit=${limit}`);
}

export async function getAnalysis(id: string): Promise<Analysis> {
  return get<Analysis>(`/api/v1/analyses/${id}`);
}

export async function startCheckout(orgId: string, plan: string, installationId: string): Promise<string> {
  const r = await fetch("/api/billing/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, plan, installationId }),
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.error || "checkout failed");
  }
  const { url } = await r.json();
  return url;
}

export async function openPortal(orgId: string, installationId: string): Promise<string> {
  const r = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, installationId }),
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.error || "portal failed");
  }
  const { url } = await r.json();
  return url;
}

export async function internalStartCheckout(orgId: string, plan: string): Promise<string> {
  const r = await fetch(`${BASE}/api/v1/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify({ org_id: orgId, plan }),
  });
  if (!r.ok) throw new Error("internal checkout failed");
  const { url } = await r.json();
  return url;
}

export async function internalOpenPortal(orgId: string): Promise<string> {
  const r = await fetch(`${BASE}/api/v1/billing/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${API_SECRET}`,
    },
    body: JSON.stringify({ org_id: orgId }),
  });
  if (!r.ok) throw new Error("internal portal failed");
  const { url } = await r.json();
  return url;
}

/** @deprecated Use formatCostDeltaCentsForUser from @/lib/currency/format */
export function formatCents(cents: number | null): string {
  if (cents === null) return "—";
  return `${cents >= 0 ? "+" : ""}$${(cents / 100).toFixed(2)}/mo`;
}

export function severityColor(sev: string): string {
  return {
    critical: "bg-red-600 text-white",
    high: "bg-orange-500 text-white",
    medium: "bg-yellow-500 text-ink",
    low: "bg-blue-500 text-white",
    info: "bg-gray-400 text-white",
  }[sev] || "bg-gray-400 text-white";
}
