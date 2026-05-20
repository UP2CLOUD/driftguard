try {
  const Sentry = require("@sentry/nextjs");
  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    Sentry.init({
      dsn,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.05,
      sendDefaultPii: false,
    });
  }
} catch {
  // @sentry/nextjs not installed — skip
}
