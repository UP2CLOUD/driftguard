const DEFAULT_GITHUB_APP_SLUG = "driftguard-app";

/**
 * GitHub App "install" URL for new installations.
 * Prefer NEXT_PUBLIC_GITHUB_APP_INSTALL_URL; fall back to slug-based URL.
 */
export function getGitHubAppInstallUrl(): string {
  const explicit =
    process.env.NEXT_PUBLIC_GITHUB_APP_INSTALL_URL ||
    process.env.NEXT_PUBLIC_GITHUB_APP_URL;
  if (explicit) {
    return explicit;
  }

  const slug =
    process.env.NEXT_PUBLIC_GITHUB_APP_SLUG ||
    DEFAULT_GITHUB_APP_SLUG;

  return `https://github.com/apps/${slug}/installations/new`;
}
