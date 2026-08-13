"use client";

import { useEffect, useState } from "react";
import { getGitHubAppInstallUrl } from "@/lib/github-app";
import { useT } from "@/components/I18nProvider";

// Mobile-only: on a phone, the hero's own CTA scrolls out of view almost
// immediately, so there's no persistent path to "Install the GitHub App"
// without scrolling back up. Desktop already has it in CommandNav at all
// times, so this stays hidden at sm: and above.
export function StickyMobileCTA() {
  const t = useT();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      const scrolledPastHero = window.scrollY > window.innerHeight * 0.6;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 400;
      setVisible(scrolledPastHero && !nearBottom);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:hidden transition-transform duration-200 ease-out ${
        visible ? "translate-y-0" : "translate-y-full pointer-events-none"
      }`}
    >
      <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)]/95 backdrop-blur-md shadow-[0_-4px_24px_rgba(0,0,0,0.3)] p-2.5">
        <a
          href={getGitHubAppInstallUrl()}
          target="_blank"
          rel="noreferrer"
          tabIndex={visible ? 0 : -1}
          className="touch-manipulation flex min-h-[48px] w-full items-center justify-center rounded bg-white px-6 text-[13px] font-medium text-black transition-colors hover:bg-white/90 active:scale-[0.97]"
        >
          {t("marketing.hero.ctaInstall")}
        </a>
      </div>
    </div>
  );
}
