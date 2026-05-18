"use client";

import { useEffect } from "react";

function scrollToHash(hash: string) {
  if (!hash || hash === "#") return;
  const id = hash.replace(/^#/, "");
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Scroll to in-page anchors on load and when the hash changes (e.g. #waitlist). */
export function HashScroll() {
  useEffect(() => {
    const run = () => scrollToHash(window.location.hash);
    run();
    window.addEventListener("hashchange", run);
    return () => window.removeEventListener("hashchange", run);
  }, []);

  return null;
}
