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
  const [error, setError] = useState("");

  async function upgrade(targetPlan: string) {
    setLoading(targetPlan);
    setError("");
    try {
      const url = await startCheckout(orgId, targetPlan, installationId);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  async function manage() {
    setLoading("portal");
    setError("");
    try {
      const url = await openPortal(orgId, installationId);
      window.location.href = url;
    } catch (e) {
      setError((e as Error).message);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="font-mono text-[11px] text-blocked">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {plan === "free" && (
          <button
            onClick={() => upgrade("team")}
            disabled={loading !== null}
            className="dg-button dg-button-primary text-[12px] disabled:opacity-40"
          >
            {loading === "team" ? "Redirecting…" : "Upgrade to Team →"}
          </button>
        )}
        {plan === "team" && (
          <button
            onClick={() => upgrade("enterprise")}
            disabled={loading !== null}
            className="dg-button dg-button-ghost text-[12px] disabled:opacity-40"
          >
            {loading === "enterprise" ? "Redirecting…" : "Upgrade to Enterprise →"}
          </button>
        )}
        {hasCustomer && (
          <button
            onClick={manage}
            disabled={loading !== null}
            className="dg-button dg-button-ghost text-[12px] disabled:opacity-40"
          >
            {loading === "portal" ? "Opening…" : "Manage billing →"}
          </button>
        )}
        {!hasCustomer && plan !== "free" && (
          <a
            href="mailto:billing@driftguard.io"
            className="dg-button dg-button-ghost text-[12px]"
          >
            Contact billing →
          </a>
        )}
      </div>
    </div>
  );
}
