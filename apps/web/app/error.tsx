"use client";

import { useT } from "@/components/I18nProvider";
import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error("[Error]", error);
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
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-md border border-blocked/30 bg-blocked/10 mx-auto">
        <svg className="h-5 w-5 text-blocked" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>
      <div>
        <p className="dg-label text-blocked mb-2">{t("common.error")}</p>
        <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)] mb-3">
          {t("dashboard.errorDesc")}
        </h2>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm">
          {error.digest
            ? `Error ID: ${error.digest}`
            : t("dashboard.errorFallback")}
        </p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="dg-button dg-button-primary text-[12px]"
        >
          {t("common.retry")}
        </button>
        <Link href="/" className="dg-button dg-button-ghost text-[12px]">
          {t("notFound.backHome")}
        </Link>
      </div>
    </div>
  );
}
