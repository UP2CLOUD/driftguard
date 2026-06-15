"use client";

import { useEffect } from "react";

const CONSENT_KEY = "dg_cookie_consent";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Only initialise if the user has already accepted cookies.
    // First-time visitors: CookieBanner handles init on explicit accept.
    if (localStorage.getItem(CONSENT_KEY) !== "accepted") return;

    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage",
        disable_session_recording: true,
      });
    }).catch(() => {});
  }, []);

  return <>{children}</>;
}
