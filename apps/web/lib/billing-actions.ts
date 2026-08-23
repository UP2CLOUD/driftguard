/**
 * Pure decision logic behind the billing actions shown on the settings page.
 *
 * Extracted out of components/BillingActions.tsx (a client component; this
 * repo's vitest config only picks up lib/**\/*.test.ts, so logic has to live
 * here to get a real test) because a real defect lived in this exact
 * decision: a paying org whose Stripe subscription was `past_due` (payment
 * retry in progress, NOT cancelled) was shown "Upgrade to Team" and a plain
 * "Manage billing" button, with nothing distinguishing "you're on the free
 * tier" from "you're a paying customer and something needs your attention".
 *
 * The underlying reason: services/billing.py resets `org.plan` to "free" for
 * any Stripe status outside {active, trialing}, including `past_due`, while
 * `is_premium()` still grants full access via `subscription_status` for that
 * same case. So `plan` alone cannot distinguish the two org states that
 * matter here, and this module takes `subscriptionStatus` as the signal that
 * actually can.
 */

export function isPastDue(subscriptionStatus: string | undefined): boolean {
  return subscriptionStatus === "premium_past_due";
}

export interface BillingActionVisibility {
  showPastDueWarning: boolean;
  showUpdatePaymentMethod: boolean;
  showUpgradeToTeam: boolean;
  showUpgradeToEnterprise: boolean;
  showManageBilling: boolean;
  showContactBillingNoCustomer: boolean;
}

/**
 * `plan` here is `org.plan` as returned by the API — already unreliable for
 * a past-due org (see module docstring), which is exactly why every branch
 * below is gated on `pastDue` rather than trusting `plan === "free"` alone.
 */
export function deriveBillingActionVisibility(params: {
  plan: string;
  hasCustomer: boolean;
  subscriptionStatus: string | undefined;
}): BillingActionVisibility {
  const pastDue = isPastDue(params.subscriptionStatus);
  return {
    showPastDueWarning: pastDue,
    showUpdatePaymentMethod: pastDue && params.hasCustomer,
    // Offering "Upgrade to Team" to an org that already has a Team
    // subscription stuck in payment retry is not an upgrade — it's a
    // confusing duplicate of the plan they're already meant to have.
    showUpgradeToTeam: params.plan === "free" && !pastDue,
    showUpgradeToEnterprise: params.plan === "team",
    // The prominent "Update payment method" button covers this action while
    // past due; a second, unlabelled "Manage billing" button next to it is
    // redundant rather than informative.
    showManageBilling: params.hasCustomer && !pastDue,
    showContactBillingNoCustomer: !params.hasCustomer && params.plan !== "free",
  };
}
