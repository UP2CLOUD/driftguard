"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
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
    <html>
      <body className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-red-500/30 bg-red-500/10 mx-auto">
            <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-widest text-red-400 mb-2">Unexpected error</p>
            <h1 className="text-xl font-semibold tracking-tight mb-3">Something went wrong</h1>
            <p className="text-sm text-gray-400 leading-relaxed">
              {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred. Our team has been notified."}
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium rounded border border-white/20 hover:bg-white/5 transition"
            >
              Try again
            </button>
            <Link href="/" className="px-4 py-2 text-sm font-medium rounded border border-blue-500/40 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition">
              Go home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
