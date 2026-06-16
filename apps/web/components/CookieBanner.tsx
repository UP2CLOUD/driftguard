"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/components/I18nProvider";
import { CONSENT_KEY } from "@/lib/consent";

export function CookieBanner() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      setVisible(true);
    }
  }, []);

  function accept() {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setVisible(false);
    // Initialise PostHog now that consent is granted
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (key) {
      import("posthog-js").then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
            capture_pageview: false,
            capture_pageleave: true,
            persistence: "localStorage",
            disable_session_recording: true,
          });
        } else {
          posthog.opt_in_capturing();
        }
      }).catch(() => {});
    }
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, "declined");
    setVisible(false);
    import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) posthog.opt_out_capturing();
    }).catch(() => {});
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label={t("cookie.ariaLabel") ?? "Cookie consent"}
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-sm z-50 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] shadow-lg p-4"
    >
      <p className="text-[12px] text-[color:var(--dg-fg-muted)] leading-relaxed mb-3">
        {t("cookie.notice")}{" "}
        <Link href="/privacy" className="text-[color:var(--dg-electric-bright)] hover:underline">
          {t("cookie.learnMore")}
        </Link>
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={accept}
          className="dg-button dg-button-primary text-[11px] px-3 py-1.5"
        >
          {t("cookie.accept")}
        </button>
        <button
          onClick={decline}
          className="dg-button dg-button-ghost text-[11px] px-3 py-1.5"
        >
          {t("cookie.decline")}
        </button>
      </div>
    </div>
  );
}
