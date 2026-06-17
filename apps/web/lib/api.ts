const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_SECRET = process.env.INTERNAL_API_SECRET || process.env.SECRET_KEY || "dev-only-change-me";

function requireSecret(): string {
  if (process.env.VERCEL_ENV === "production" && API_SECRET === "dev-only-change-me") {
    throw new Error(
      "INTERNAL_API_SECRET / SECRET_KEY is using the insecure default in production."
    );
  }
  return API_SECRET;
}

export type Org = {
  id: string;
  installation_id: number;
  plan: string;
  has_stripe_customer: boolean;
  aws_role_arn?: string | null;
  aws_external_id?: string | null;
  aws_state_bucket?: string | null;
  aws_state_key?: string | null;
  contact_email?: string | null;
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
  repo_full_name: string;
  policy_verdict: string | null;
  created_at: string | null;
  files_scanned: number;
};

export type Finding = {
  type: string;
  severity: string;
  resource: string;
  message: string;
  suggestion: string | null;
  rule_id?: string | null;
  category?: string | null;
  title?: string | null;
  file?: string | null;
  line?: number | null;
  controls?: string[];
};

export type Analysis = {
  id: string;
  status: string;
  cost_delta_cents: number | null;
  risk_score: number | null;
  summary_md: string | null;
  ai_summary?: string | null;
  findings: Finding[];
  repo_full_name?: string | null;
  pr_number?: number | null;
  head_sha?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  files_scanned?: number;
  critical?: number;
  high?: number;
  duration_ms?: number | null;
  errors?: string[];
};

export type FinOpsReview = {
  id: string;
  analysis_id: string;
  repo_full_name: string;
  pr_number: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_score: number;
  current_monthly_cents: number;
  new_monthly_cents: number;
  delta_monthly_cents: number;
  delta_annual_cents: number;
  delta_pct: number;
  terraform_files: string[];
  resource_costs: Record<string, number>;
  recommendations: Array<{ title: string; detail: string; severity: string }>;
  risk_reasons: string[];
  ai_summary: string | null;
  created_at: string | null;
};

export type FinOpsDashboard = {
  total_reviews: number;
  total_monthly_delta_cents: number;
  average_monthly_delta_cents: number;
  highest_risk_score: number;
  provider_breakdown: { aws: number; gcp: number; azure: number };
  recent_reviews: FinOpsReview[];
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function messageFromApiBody(data: Record<string, unknown>, fallback: string): string {
  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg?: string }).msg ?? "");
        }
        return "";
      })
      .filter(Boolean);
    if (parts.length) return parts.join("; ");
  }
  if (typeof data.error === "string" && data.error.trim()) return data.error;
  return fallback;
}

async function throwApiError(r: Response, fallback: string): Promise<never> {
  const data = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  throw new ApiError(r.status, messageFromApiBody(data, fallback));
}

async function get<T>(path: string): Promise<T> {
  const headers: HeadersInit = {};
  if (typeof window === "undefined") {
    headers["Authorization"] = `Bearer ${requireSecret()}`;
  }
  const r = await fetch(`${BASE}${path}`, {
    cache: "no-store",
    headers,
    signal: AbortSignal.timeout(8000),
  });
  if (!r.ok) throw new ApiError(r.status, `${path}: ${r.status}`);
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
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.error || "checkout failed");
  }
  const data = await r.json().catch(() => null);
  const url = data?.url;
  if (!url) throw new Error("checkout response missing redirect URL");
  return url;
}

export async function openPortal(orgId: string, installationId: string): Promise<string> {
  const r = await fetch("/api/billing/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orgId, installationId }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) {
    const errData = await r.json().catch(() => ({}));
    throw new Error(errData.error || "portal failed");
  }
  const data = await r.json().catch(() => null);
  const url = data?.url;
  if (!url) throw new Error("portal response missing redirect URL");
  return url;
}

export async function internalStartCheckout(
  orgId: string,
  plan: string,
  installationId?: string,
): Promise<string> {
  const r = await fetch(`${BASE}/api/v1/billing/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${requireSecret()}`,
    },
    body: JSON.stringify({ org_id: orgId, plan, installation_id: installationId }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) await throwApiError(r, "Failed to start checkout");
  const data = await r.json().catch(() => null);
  const url = data?.url;
  if (!url) throw new Error("checkout response missing redirect URL");
  return url;
}

export async function internalOpenPortal(orgId: string, email?: string | null): Promise<string> {
  const r = await fetch(`${BASE}/api/v1/billing/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${requireSecret()}`,
    },
    body: JSON.stringify({ org_id: orgId, email: email ?? undefined }),
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) await throwApiError(r, "Failed to open billing portal");
  const data = await r.json().catch(() => null);
  const url = data?.url;
  if (!url) throw new Error("portal response missing redirect URL");
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
