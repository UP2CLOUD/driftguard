export async function register() {
  // Only validate at Node.js runtime startup, not during edge middleware
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const required = [
    "SECRET_KEY",
    "AUTH_SECRET",
    "AUTH_GITHUB_ID",
    "AUTH_GITHUB_SECRET",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    // Log loudly — don't throw so Next.js can still start and surface the error page
    console.error(
      `[DriftGuard] ⚠ Missing required environment variables: ${missing.join(", ")}.\n` +
      `  Copy .env.example to .env.local and fill in the values.`
    );
  }
}
