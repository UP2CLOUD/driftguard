"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    if (typeof window !== "undefined") {
      import("posthog-js")
        .then(({ default: posthog }) => {
          if (posthog.__loaded) {
            posthog.capture("$exception", {
              $exception_message: error.message,
              $exception_type: error.name,
              digest: error.digest,
            });
          }
        })
        .catch(() => {});
    }
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="dg-label text-blocked">Something went wrong</div>
      <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)]">Dashboard error</h2>
      <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="dg-button dg-button-primary text-[12px]"
        >
          Retry
        </button>
        <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
