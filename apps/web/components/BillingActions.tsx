"use client";

import { useState } from "react";
import { openPortal, startCheckout } from "@/lib/api";
import { useT } from "@/components/I18nProvider";
import { deriveBillingActionVisibility } from "@/lib/billing-actions";

const _BILLING_UNCONFIGURED = /billing is not configured|missing stripe/i;

export function BillingActions({
  orgId,
  installationId,
  hasCustomer,
  plan,
  billingEnabled = true,
  subscriptionStatus,
}: {
  orgId: string;
  installationId: string;
  hasCustomer: boolean;
  plan: string;
  billingEnabled?: boolean;
  /** `services/billing.py::apply_subscription_event` resets `org.plan` to
   * "free" for any Stripe status outside {active, trialing} — including
   * `past_due`, `unpaid`, and `paused`, which `is_premium()` still grants
   * full access for (subscription_status "premium_past_due" — a payment
   * retry grace period, not a cancellation). That means `plan` alone cannot
   * tell a genuinely-free org from a paying org mid dunning; without this,
   * that org saw "Free plan" highlighted and an "Upgrade to Team" button,
   * with no indication anything needed their attention. */
  subscriptionStatus?: string;
}) {
  const t = useT();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [billingUnavailable, setBillingUnavailable] = useState(!billingEnabled);
  const visibility = deriveBillingActionVisibility({ plan, hasCustomer, subscriptionStatus });

  async function upgrade(targetPlan: string) {
    setLoading(targetPlan);
    setError("");
    setBillingUnavailable(false);
    try {
      const url = await startCheckout(orgId, targetPlan, installationId);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
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
      const msg = e instanceof Error ? e.message : String(e);
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
      {visibility.showPastDueWarning && (
        <div className="rounded-md border border-warned/30 bg-warned/5 px-4 py-3.5 flex items-start gap-3">
          <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-warned shrink-0" />
          <div className="space-y-1">
            <p className="font-mono text-[11px] font-semibold text-warned">
              {t("settings.paymentIssueTitle") ?? "There's a problem with your payment"}
            </p>
            <p className="font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
              {t("settings.paymentIssueBody") ??
                "Your last payment failed. Your plan is still active for now — update your payment method to avoid losing access."}
            </p>
          </div>
        </div>
      )}
      {error && (
        <p className="font-mono text-[11px] text-blocked">{error}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {visibility.showUpdatePaymentMethod && (
          <button
            onClick={manage}
            disabled={loading !== null}
            className="dg-button dg-button-primary text-[12px] disabled:opacity-40"
          >
            {loading === "portal"
              ? (t("settings.openingPortal") ?? "Opening…")
              : (t("settings.updatePaymentMethod") ?? "Update payment method →")}
          </button>
        )}
        {visibility.showUpgradeToTeam && (
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
        {visibility.showUpgradeToEnterprise && (
          <a
            href="mailto:sales@driftguard.io"
            className="dg-button dg-button-ghost text-[12px]"
          >
            {t("settings.upgradeToEnterprise") ?? "Upgrade to Enterprise →"}
          </a>
        )}
        {visibility.showManageBilling && (
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
        {visibility.showContactBillingNoCustomer && (
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
