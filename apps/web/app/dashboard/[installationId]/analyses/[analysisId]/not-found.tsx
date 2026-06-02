"use client";

import Link from "next/link";
import { useT } from "@/components/I18nProvider";

export default function AnalysisNotFound() {
  const t = useT();
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="dg-label">404</div>
      <h2 className="font-sans text-xl font-semibold tracking-tight text-[color:var(--dg-fg)]">
        {t("dashboard.analysisNotFound")}
      </h2>
      <p className="text-[13px] text-[color:var(--dg-fg-muted)] max-w-sm">
        {t("dashboard.analysisNotFoundDesc")}
      </p>
      <Link href="/dashboard" className="dg-button dg-button-ghost text-[12px]">
        ← {t("dashboard.backToDashboard")}
      </Link>
    </div>
  );
}
