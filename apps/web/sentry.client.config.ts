// Loaded automatically by Next.js if @sentry/nextjs is installed
try {
  const Sentry = require("@sentry/nextjs");
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
      replaysOnErrorSampleRate: 0.5,
      replaysSessionSampleRate: 0.0,
      sendDefaultPii: false,
    });
  }
} catch {
  // @sentry/nextjs not installed — skip
}
