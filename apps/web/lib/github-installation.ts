/**
 * Fetch repos for a GitHub App installation directly from GitHub API.
 * Used as fallback when the DriftGuard backend API is unreachable.
 */

import { auth } from "@/auth";

const GH_API = "https://api.github.com";

interface GhRepo {
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
  html_url: string;
}

export async function fetchInstallationRepos(
  installationId: string
): Promise<GhRepo[]> {
  const session = await auth();
  const token = session?.user?.accessToken;
  if (!token) return [];

  try {
    // The user's OAuth token can list installation repos they have access to
    const res = await fetch(
      `${GH_API}/user/installations/${installationId}/repositories?per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
        next: { revalidate: 60 },
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.repositories ?? [];
  } catch {
    return [];
  }
}
