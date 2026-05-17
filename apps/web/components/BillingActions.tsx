"use client";

import { useState } from "react";

import { openPortal, startCheckout } from "@/lib/api";

export function BillingActions({
  orgId,
  installationId,
  hasCustomer,
  plan,
}: {
  orgId: string;
  installationId: string;
  hasCustomer: boolean;
  plan: string;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function upgrade(targetPlan: string) {
    setLoading(targetPlan);
    try {
      const url = await startCheckout(orgId, targetPlan, installationId);
      window.location.href = url;
    } catch (e) {
      setLoading(null);
      alert(`Checkout failed: ${(e as Error).message}`);
    }
  }

  async function manage() {
    setLoading("portal");
    try {
      const url = await openPortal(orgId, installationId);
      window.location.href = url;
    } catch (e) {
      setLoading(null);
      alert(`Portal failed: ${(e as Error).message}`);
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {plan === "free" && (
        <>
          <button
            onClick={() => upgrade("pro")}
            disabled={loading !== null}
            className="rounded-full bg-accent px-6 py-2 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {loading === "pro" ? "..." : "Upgrade to Pro"}
          </button>
          <button
            onClick={() => upgrade("team")}
            disabled={loading !== null}
            className="rounded-full bg-ink px-6 py-2 text-sm font-semibold text-paper disabled:opacity-60"
          >
            {loading === "team" ? "..." : "Upgrade to Team"}
          </button>
        </>
      )}
      {hasCustomer && (
        <button
          onClick={manage}
          disabled={loading !== null}
          className="rounded-full border border-ink/20 px-6 py-2 text-sm disabled:opacity-60"
        >
          {loading === "portal" ? "..." : "Manage billing"}
        </button>
      )}
    </div>
  );
}
