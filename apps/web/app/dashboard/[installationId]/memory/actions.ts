"use server";

import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";

export type RecallHit = {
  id: string;
  analysis_id: string | null;
  repo_full_name: string;
  pr_number: number;
  intent_text: string | null;
  severity: string | null;
  outcome: string;
  similarity: number;
};

export async function recallMemory(
  installationId: string,
  query: string
): Promise<{ ok: true; hits: RecallHit[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "unauthorized" };

  const trimmed = query.trim();
  if (trimmed.length < 3) return { ok: false, error: "query_too_short" };

  const res = await fetch(
    `${BACKEND_URL}/api/v1/memory/recall?installation_id=${encodeURIComponent(installationId)}`,
    {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      // min_similarity baixo para UX exploratório — o ranking ordena por relevância
      body: JSON.stringify({ query: trimmed, top_k: 8, min_similarity: 0.3 }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    }
  ).catch(() => null);

  if (!res) return { ok: false, error: "network" };
  if (!res.ok) return { ok: false, error: `backend_${res.status}` };

  const hits = (await res.json()) as RecallHit[];
  return { ok: true, hits };
}
