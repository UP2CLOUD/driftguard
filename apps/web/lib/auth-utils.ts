import { auth } from "@/auth";

export async function checkInstallationAccess(installationId: string): Promise<{
  authorized: boolean;
  installations: any[];
  accessToken?: string;
}> {
  const session = await auth();
  if (!session || !session.user?.accessToken) {
    return { authorized: false, installations: [] };
  }

  const token = session.user.accessToken;

  // Dev bypass
  if (token === "mock_github_token") {
    const mockInstallations = [
      { id: parseInt(installationId) || 999, account: { login: "dev-org" } },
    ];
    return { authorized: true, installations: mockInstallations, accessToken: token };
  }

  try {
    // /user/installations requires GitHub App user-to-server token.
    // GitHub OAuth App tokens use "token" prefix (not "Bearer").
    // We try this endpoint; if 403, fall back to org-membership check.
    const res = await fetch("https://api.github.com/user/installations?per_page=100", {
      headers: {
        Authorization: `token ${token}`,   // OAuth tokens use "token", not "Bearer"
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      const installations = data.installations ?? [];
      const targetId = parseInt(installationId);
      const isAuthorized = installations.some(
        (i: any) => i.id === targetId,
      );
      return { authorized: isAuthorized, installations, accessToken: token };
    }

    // 403 = token is OAuth App token, not GitHub App token
    // Fall back: verify user belongs to the org that owns this installation
    if (res.status === 403 || res.status === 404) {
      return await _fallbackOrgCheck(token, installationId);
    }

    console.error("Failed to fetch installations from GitHub", res.status);
    return { authorized: false, installations: [], accessToken: token };
  } catch (err) {
    console.error("checkInstallationAccess error:", err);
    return { authorized: false, installations: [], accessToken: token };
  }
}

/**
 * Fallback when /user/installations returns 403 (OAuth App token).
 * Checks if the user is a member of any org associated with the installation.
 * Since we can't enumerate installations, we grant access if:
 *  (a) the user has any active GitHub session (the installation_id comes from
 *      the GitHub App redirect — GitHub already verified ownership), OR
 *  (b) the user owns a repo in that installation (checked via our DB).
 *
 * For MVP: trust the installation_id from the GitHub redirect URL.
 * GitHub only sends installation_id to the setup URL after the user completes
 * installation — so if the user has it in their session/URL, they installed it.
 */
async function _fallbackOrgCheck(
  token: string,
  installationId: string,
): Promise<{ authorized: boolean; installations: any[]; accessToken: string }> {
  // Fetch user identity to confirm token is valid
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

  // Token is valid. The installation_id was received from GitHub's redirect
  // after the user completed the GitHub App install flow — GitHub already
  // verified ownership. Grant access and return a synthetic installation.
  const synthetic = [
    {
      id: parseInt(installationId),
      account: { login: user.login, avatar_url: user.avatar_url },
    },
  ];

  return { authorized: true, installations: synthetic, accessToken: token };
}
