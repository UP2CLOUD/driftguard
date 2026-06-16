"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useT } from "@/components/I18nProvider";

export function DemoToggle({ active }: { active: boolean }) {
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  async function toggle() {
    await fetch("/api/demo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enable: !active }),
    });
    startTransition(() => router.refresh());
  }

  if (active) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-warned/30 bg-warned/5 px-4 py-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
        <span className="flex-1 font-sans font-medium text-[10px] uppercase tracking-widest text-warned">
          {t("dashboard.demoActive") ?? "Demo telemetry — connect GitHub to see real data"}
        </span>
        <button
          onClick={toggle}
          disabled={pending}
          className="font-sans font-medium text-[10px] text-warned/70 hover:text-warned transition disabled:opacity-50 shrink-0"
        >
          {t("dashboard.exitDemo") ?? "Exit demo"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className="flex items-center gap-2 rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-sans font-medium text-[10px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition disabled:opacity-50"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--dg-fg-subtle)]" />
      {t("dashboard.viewDemo") ?? "View demo telemetry"}
    </button>
  );
}
