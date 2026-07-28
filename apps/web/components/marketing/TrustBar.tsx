"use client";

import Link from "next/link";
import { Lock, MapPin, KeyRound, BadgeCheck } from "lucide-react";
import { Reveal } from "./Reveal";
import { useT } from "@/components/TranslationProvider";

export function TrustBar() {
  const t = useT();

  // Honest, sourced facts — kept in sync with app/security/page.tsx and
  // app/compliance/page.tsx. No adoption/uptime claims.
  const POINTS = [
    { icon: Lock, label: t("marketing.trustBar.tls") },
    { icon: MapPin, label: t("marketing.trustBar.residency") },
    { icon: KeyRound, label: t("marketing.trustBar.leastPriv") },
    { icon: BadgeCheck, label: t("marketing.trustBar.soc2") },
  ];

  return (
    <div className="w-full border-t border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)]">
      <Reveal
        distance={8}
        className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-6 py-6 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-3"
      >
        {POINTS.map(({ icon: Icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]"
          >
            <Icon className="h-3.5 w-3.5 shrink-0 text-[color:var(--dg-electric)]" strokeWidth={2} aria-hidden="true" />
            <span className="text-center sm:text-left">{label}</span>
          </div>
        ))}
        <Link
          href="/security"
          className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] transition-colors hover:text-white active:text-white"
        >
          {t("marketing.trustBar.link")}
        </Link>
      </Reveal>
    </div>
  );
}
