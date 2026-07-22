import { describe, it, expect, afterEach } from "vitest";
import { getGitHubAppInstallUrl } from "./github-app";

const ENV_KEYS = [
  "NEXT_PUBLIC_GITHUB_APP_INSTALL_URL",
  "NEXT_PUBLIC_GITHUB_APP_URL",
  "NEXT_PUBLIC_GITHUB_APP_SLUG",
];

function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

describe("getGitHubAppInstallUrl", () => {
  afterEach(clearEnv);

  it("falls back to the default slug-based install URL", () => {
    clearEnv();
    expect(getGitHubAppInstallUrl()).toBe(
      "https://github.com/apps/driftguard-app/installations/new",
    );
  });

  it("uses NEXT_PUBLIC_GITHUB_APP_SLUG when set", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG = "acme-driftguard";
    expect(getGitHubAppInstallUrl()).toBe(
      "https://github.com/apps/acme-driftguard/installations/new",
    );
  });

  it("prefers an explicit install URL over the slug", () => {
    clearEnv();
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG = "ignored";
    process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL = "https://github.com/apps/x/installations/new";
    expect(getGitHubAppInstallUrl()).toBe("https://github.com/apps/x/installations/new");
  });
});
