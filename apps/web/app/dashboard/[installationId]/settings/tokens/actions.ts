"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { BACKEND_URL, authHeaders } from "@/lib/backend";
import { mintBackendJwt } from "@/lib/backend-jwt";

export type TokenItem = {
  id: string;
  name: string;
  role: string;
  scopes: string | null;
  revoked: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
};

export type CreatedToken = {
  id: string;
  name: string;
  token: string; // plaintext — shown once
  role: string;
  expires_at: string | null;
};

async function adminJwtFor(installationId: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user) return null;

  // internal-auth lookup → org_id (bootstraps the org if needed)
  const res = await fetch(
    `${BACKEND_URL}/api/v1/orgs/by-installation/${installationId}`,
    { headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000) }
  ).catch(() => null);
  if (!res?.ok) return null;
  const org = (await res.json()) as { id?: string };
  if (!org?.id) return null;

  return mintBackendJwt({
    orgId: org.id,
    userId: session.user.login || session.user.id || "web",
  });
}

export async function listTokens(installationId: string): Promise<TokenItem[] | null> {
  const jwt = await adminJwtFor(installationId);
  if (!jwt) return null;
  const res = await fetch(`${BACKEND_URL}/api/v1/tokens`, {
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!res?.ok) return null;
  return res.json();
}

export async function createToken(
  installationId: string,
  name: string,
  role: string
): Promise<{ ok: true; token: CreatedToken } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "name_required" };

  const jwt = await adminJwtFor(installationId);
  if (!jwt) return { ok: false, error: "unauthorized" };

  const res = await fetch(`${BACKEND_URL}/api/v1/tokens`, {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: trimmed, role }),
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  if (!res) return { ok: false, error: "network" };
  if (!res.ok) return { ok: false, error: `backend_${res.status}` };

  revalidatePath(`/dashboard/${installationId}/settings/tokens`);
  return { ok: true, token: await res.json() };
}

export async function revokeToken(
  installationId: string,
  tokenId: string
): Promise<{ ok: boolean }> {
  const jwt = await adminJwtFor(installationId);
  if (!jwt) return { ok: false };

  const res = await fetch(`${BACKEND_URL}/api/v1/tokens/${tokenId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${jwt}` },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);

  revalidatePath(`/dashboard/${installationId}/settings/tokens`);
  return { ok: !!res?.ok };
}
