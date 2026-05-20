"use client";

import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;
    // Dynamic import — avoids crash if posthog-js not yet installed
    import("posthog-js").then(({ default: posthog }) => {
      if (posthog.__loaded) return;
      posthog.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
        capture_pageview: false,
        capture_pageleave: true,
        persistence: "localStorage",
        disable_session_recording: true,
      });
    }).catch(() => {
      // posthog-js not installed — skip silently
    });
  }, []);

  return <>{children}</>;
}
