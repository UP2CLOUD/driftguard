"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07080a",
          color: "#e8eaed",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", padding: 24 }}>
          <p
            style={{
              fontFamily: "ui-monospace, monospace",
              fontSize: 11,
              textTransform: "uppercase",
              letterSpacing: "0.25em",
              color: "#6b7280",
              margin: "0 0 8px",
            }}
          >
            driftguard · runtime fault
          </p>
          <h1 style={{ fontSize: 18, fontWeight: 600, margin: "0 0 16px" }}>
            Something went wrong
          </h1>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- router may be unavailable in global-error */}
          <a
            href="/"
            style={{
              display: "inline-block",
              background: "#3F8CFF",
              color: "#fff",
              borderRadius: 8,
              padding: "10px 18px",
              fontSize: 13,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Back to home
          </a>
        </div>
      </body>
    </html>
  );
}
