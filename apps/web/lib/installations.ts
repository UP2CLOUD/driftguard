/**
 * List GitHub App installations accessible to the current user.
 *
 * Strategy (in order):
 * 1. Our backend API — keyed by GitHub login stored in the JWT.
 * 2. GitHub token validation — trust installation_id from the redirect.
 * 3. Empty array — show "Install GitHub App" CTA.
 *
 * We deliberately do NOT call GET /user/installations — that endpoint
 * requires GitHub App user-to-server tokens, not OAuth App tokens.
 */
import type { Session } from "next-auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_SECRET = process.env.SECRET_KEY ?? "dev-only-change-me";

export interface Installation {
  id: number;
  account: { login: string; avatar_url?: string };
}

export async function getInstallations(session: Session | null): Promise<Installation[]> {
  if (!session?.user?.accessToken) return [];

  const login = session.user.login ?? "";

  // 1. Our backend
  if (login) {
    try {
      const res = await fetch(
        `${API_URL}/api/v1/orgs/by-user?login=${encodeURIComponent(login)}`,
        {
          headers: { Authorization: `Bearer ${API_SECRET}` },
          next: { revalidate: 30 },
          signal: AbortSignal.timeout(3000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        return (data as any[]).map((o) => ({
          id: o.installation_id ?? o.id,
          account: o.account ?? { login },
        }));
      }
    } catch {
      // Backend offline
    }
  }

  // 2. Backend offline — return empty (dashboard root shows install CTA)
  return [];
}
