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
import { beGet } from "@/lib/backend";

export interface Installation {
  id: number;
  account: { login: string; avatar_url?: string };
}

export async function getInstallations(session: Session | null): Promise<Installation[]> {
  if (!session?.user?.accessToken) return [];

  const login = session.user.login ?? "";

  // 1. Our backend
  if (login) {
    const data = await beGet<Array<{ installation_id?: number; id?: number; account?: { login: string; avatar_url?: string } }>>(
      `/api/v1/orgs/by-user?login=${encodeURIComponent(login)}`,
      { revalidate: 30, timeout: 3000 },
    );
    if (data) {
      return data
        .filter((o) => {
          const l = o.account?.login ?? "";
          return !!l && !/^installation-\d+$/.test(l);
        })
        .map((o) => ({
          id: o.installation_id ?? o.id ?? 0,
          account: o.account ?? { login },
        }));
    }
  }

  // 2. Backend offline — return empty (dashboard root shows install CTA)
  return [];
}
