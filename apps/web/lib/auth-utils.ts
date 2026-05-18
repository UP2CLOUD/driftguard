import { auth } from "@/auth";

export async function checkInstallationAccess(installationId: string): Promise<{
  authorized: boolean;
  installations: any[];
  accessToken?: string;
}> {
  const session = await auth();
  if (!session || !(session as any).accessToken) {
    return { authorized: false, installations: [] };
  }

  const token = (session as any).accessToken;

  if (token === "mock_github_token") {
    const mockInstallations = [
      {
        id: 999,
        account: {
          login: "acme-corp",
          avatar_url: "https://github.com/github.png",
        },
      },
    ];
    const isAuthorized = String(installationId) === "999" || installationId === "undefined" || !installationId;
    return {
      authorized: isAuthorized,
      installations: mockInstallations,
      accessToken: token,
    };
  }

  try {
    const res = await fetch("https://api.github.com/user/installations", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "driftguard-web",
      },
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      console.error("Failed to fetch installations from GitHub", res.status);
      return { authorized: false, installations: [], accessToken: token };
    }

    const data = await res.json();
    const installations = data.installations || [];
    
    // Check if the requested installationId is present
    const isAuthorized = installations.some(
      (inst: any) => String(inst.id) === String(installationId)
    );

    return {
      authorized: isAuthorized,
      installations,
      accessToken: token,
    };
  } catch (err) {
    console.error("Error checking installation access", err);
    return { authorized: false, installations: [], accessToken: token };
  }
}
