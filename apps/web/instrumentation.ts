import * as Sentry from "@sentry/nextjs";

export async function register() {
  // Env validation (Node.js runtime only)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const required = ["SECRET_KEY", "AUTH_SECRET", "AUTH_GITHUB_ID", "AUTH_GITHUB_SECRET"];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      console.error(
        `[DriftGuard] ⚠ Missing required environment variables: ${missing.join(", ")}.\n` +
          `  Copy .env.example to .env.local and fill in the values.`
      );
    }
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
