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
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="dg-label text-blocked">Error</div>
      <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
        Something went wrong
      </h2>
      <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="dg-button dg-button-primary text-[12px]"
        >
          Try again
        </button>
        <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
