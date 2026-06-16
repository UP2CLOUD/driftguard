"use client";

import { useT } from "@/components/TranslationProvider";
import { useEffect, useRef, useState } from "react";

export function TrustBar() {
  const t = useT();
  const trackRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  const ROLES = [
    t("landing.trustBar.platformEngineers"),  t("landing.trustBar.devopsTeams"),         t("landing.trustBar.infraLeads"),
    t("landing.trustBar.sreTeams"),           t("landing.trustBar.aiAgentOperators"),    t("landing.trustBar.cloudArchitects"),
    t("landing.trustBar.complianceEngineers"),t("landing.trustBar.finopsAnalysts"),       t("landing.trustBar.securityEngineers"),
    t("landing.trustBar.staffEngineers"),     t("landing.trustBar.platformEngineers"),   t("landing.trustBar.devopsTeams"),
    t("landing.trustBar.infraLeads"),         t("landing.trustBar.sreTeams"),             t("landing.trustBar.aiAgentOperators"),
    t("landing.trustBar.cloudArchitects"),    t("landing.trustBar.complianceEngineers"),  t("landing.trustBar.finopsAnalysts"),
    t("landing.trustBar.securityEngineers"),  t("landing.trustBar.staffEngineers"),
  ];

  return (
    <section
      className="border-t border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/60 py-4 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Edge fades */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10
        bg-gradient-to-r from-[color:var(--dg-surface)] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10
        bg-gradient-to-l from-[color:var(--dg-surface)] to-transparent" />

      {/* Scrolling track */}
      <div
        ref={trackRef}
        className="flex whitespace-nowrap"
        style={{
          animation: `dg-marquee 40s linear infinite`,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        {/* Double the list for seamless loop */}
        {[...ROLES, ...ROLES].map((role, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-2.5 px-5 font-sans font-medium text-[10px] uppercase tracking-[0.2em] text-[color:var(--dg-fg-subtle)] select-none"
          >
            <span className="h-1 w-1 rounded-full bg-[color:var(--dg-fg-subtle)]/40 shrink-0" />
            {role}
          </span>
        ))}
      </div>
    </section>
  );
}
