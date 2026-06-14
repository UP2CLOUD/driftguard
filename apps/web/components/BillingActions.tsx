"use client";

import { useState } from "react";
import { openPortal, startCheckout } from "@/lib/api";
import { useT } from "@/components/I18nProvider";

const _BILLING_UNCONFIGURED = /billing is not configured|missing stripe/i;

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
  const t = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [billingUnavailable, setBillingUnavailable] = useState(false);

  async function upgrade(targetPlan: string) {
    setLoading(targetPlan);
    setError("");
    setBillingUnavailable(false);
    try {
      const url = await startCheckout(orgId, targetPlan, installationId);
      window.location.href = url;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (_BILLING_UNCONFIGURED.test(msg)) {
        setBillingUnavailable(true);
      } else {
        setError(msg);
      }
      setLoading(null);
    }
  }

  async function manage() {
    setLoading("portal");
    setError("");
    setBillingUnavailable(false);
    try {
      const url = await openPortal(orgId, installationId);
      window.location.href = url;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (_BILLING_UNCONFIGURED.test(msg)) {
        setBillingUnavailable(true);
      } else {
        setError(msg);
      }
      setLoading(null);
    }
  }

  if (billingUnavailable) {
    return (
      <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-4 py-4 flex items-start gap-3">
        <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
        <div className="space-y-1">
          <p className="font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
            {t("settings.billingUnavailable") ??
              "Online billing is not enabled for this instance."}
          </p>
          <a
            href="mailto:billing@driftguard.io"
            className="font-mono text-[11px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
          >
            {t("settings.contactBilling") ?? "Contact billing →"}
          </a>
        </div>
      </div>
    );
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
            {loading === "team"
              ? (t("settings.redirecting") ?? "Redirecting…")
              : (t("settings.upgradeToTeam") ?? "Upgrade to Team →")}
          </button>
        )}
        {plan === "team" && (
          <button
            onClick={() => upgrade("enterprise")}
            disabled={loading !== null}
            className="dg-button dg-button-ghost text-[12px] disabled:opacity-40"
          >
            {loading === "enterprise"
              ? (t("settings.redirecting") ?? "Redirecting…")
              : (t("settings.upgradeToEnterprise") ?? "Upgrade to Enterprise →")}
          </button>
        )}
        {hasCustomer && (
          <button
            onClick={manage}
            disabled={loading !== null}
            className="dg-button dg-button-ghost text-[12px] disabled:opacity-40"
          >
            {loading === "portal"
              ? (t("settings.openingPortal") ?? "Opening…")
              : (t("settings.manageBilling") ?? "Manage billing →")}
          </button>
        )}
        {!hasCustomer && plan !== "free" && (
          <a
            href="mailto:billing@driftguard.io"
            className="dg-button dg-button-ghost text-[12px]"
          >
            {t("settings.contactBilling") ?? "Contact billing →"}
          </a>
        )}
      </div>
    </div>
  );
}
