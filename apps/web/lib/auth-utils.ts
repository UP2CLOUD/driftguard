/**
 * Installation access checking.
 *
 * IMPORTANT: GET /user/installations only works with GitHub App user-to-server
 * tokens. Our NextAuth flow uses a GitHub OAuth App token — this endpoint
 * always returns 403. We do NOT call that endpoint.
 *
 * Instead: look up installations in our own database via the backend API,
 * keyed by the GitHub username stored in the session JWT.
 */
import { auth } from "@/auth";
import { beGet } from "@/lib/backend";

export interface Installation {
  id: number;
  account: {
    login: string;
    avatar_url?: string;
  };
}

export async function checkInstallationAccess(installationId: string): Promise<{
  authorized: boolean;
  installations: Installation[];
  accessToken?: string;
}> {
  const session = await auth();
  if (!session?.user?.accessToken) {
    return { authorized: false, installations: [] };
  }

  const token = session.user.accessToken;
  const login = session.user.login ?? "";

  // 1. Try our backend — returns installations for this GitHub user
  const backendData = await beGet<Array<{id?: number; installation_id?: number; account?: {login: string; avatar_url?: string}}>>(
    `/api/v1/orgs/by-user?login=${encodeURIComponent(login)}`,
    { revalidate: 60, timeout: 3000 },
  );
  if (backendData) {
    const targetId = parseInt(installationId);
    // Backend returns installation_id (GitHub ID) + id (UUID) — check both
    const authorized = !installationId || installationId === "dummy" ||
      backendData.some((i) => (i.installation_id ?? i.id) === targetId);
    const installations: Installation[] = backendData.map((o) => ({
      id: o.installation_id ?? (o.id as unknown as number) ?? 0,
      account: o.account ?? { login },
    }));
    return { authorized, installations, accessToken: token };
  }

  // 2. Backend offline: verify the GitHub token is valid, then trust the
  //    installation_id (it comes from GitHub's redirect after the user
  //    completes install — GitHub already verified ownership).
  try {
    const userRes = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    if (!userRes.ok) {
      return { authorized: false, installations: [], accessToken: token };
    }

    const user = await userRes.json();
    const userLogin = user.login ?? login;

    if (!installationId || installationId === "dummy") {
      // No specific installation — return empty (dashboard root will show install CTA)
      return { authorized: false, installations: [], accessToken: token };
    }

    // Trust the installation_id — GitHub sent it after the user installed the app
    return {
      authorized: true,
      installations: [{
        id: parseInt(installationId),
        account: { login: userLogin, avatar_url: user.avatar_url },
      }],
      accessToken: token,
    };
  } catch {
    return { authorized: false, installations: [], accessToken: token };
  }
}
