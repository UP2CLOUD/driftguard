import { describe, it, expect } from "vitest";
import { isPastDue, deriveBillingActionVisibility } from "./billing-actions";

/**
 * services/billing.py resets `org.plan` to "free" for any Stripe status
 * outside {active, trialing} -- including "past_due", where is_premium()
 * still grants full access via subscription_status (a payment-retry grace
 * period, not a cancellation). Before this, the settings page used `plan`
 * alone to decide what to show a paying org stuck in that state: it saw
 * "Free plan" highlighted and an "Upgrade to Team" button, with nothing
 * telling them a payment had actually failed.
 */

describe("isPastDue", () => {
  it("is true only for the exact premium_past_due status", () => {
    expect(isPastDue("premium_past_due")).toBe(true);
  });

  it("is false for active, free, and undefined", () => {
    expect(isPastDue("premium_active")).toBe(false);
    expect(isPastDue("free")).toBe(false);
    expect(isPastDue(undefined)).toBe(false);
  });
});

describe("deriveBillingActionVisibility", () => {
  it("a paying org past due sees the warning and update-payment CTA, not an upgrade offer", () => {
    // This is the exact org state that was broken: plan="free" (reset by the
    // backend) but subscription_status="premium_past_due" (still a real
    // Team subscriber whose payment failed).
    const v = deriveBillingActionVisibility({
      plan: "free",
      hasCustomer: true,
      subscriptionStatus: "premium_past_due",
    });
    expect(v.showPastDueWarning).toBe(true);
    expect(v.showUpdatePaymentMethod).toBe(true);
    expect(v.showUpgradeToTeam).toBe(false);
    expect(v.showManageBilling).toBe(false);
  });

  it("a past-due org with no Stripe customer on file gets no dead-end button", () => {
    // hasCustomer=false here shouldn't happen in practice (past_due implies
    // a subscription exists), but the update-payment CTA must never render
    // without something for it to act on.
    const v = deriveBillingActionVisibility({
      plan: "free",
      hasCustomer: false,
      subscriptionStatus: "premium_past_due",
    });
    expect(v.showUpdatePaymentMethod).toBe(false);
  });

  it("a genuinely free org sees the upgrade offer", () => {
    const v = deriveBillingActionVisibility({
      plan: "free",
      hasCustomer: false,
      subscriptionStatus: undefined,
    });
    expect(v.showUpgradeToTeam).toBe(true);
    expect(v.showPastDueWarning).toBe(false);
  });

  it("an active team org sees manage billing and the enterprise upsell, not the past-due path", () => {
    const v = deriveBillingActionVisibility({
      plan: "team",
      hasCustomer: true,
      subscriptionStatus: "premium_active",
    });
    expect(v.showManageBilling).toBe(true);
    expect(v.showUpgradeToEnterprise).toBe(true);
    expect(v.showPastDueWarning).toBe(false);
    expect(v.showUpdatePaymentMethod).toBe(false);
  });

  it("a paid org somehow missing a Stripe customer gets a contact-billing fallback", () => {
    const v = deriveBillingActionVisibility({
      plan: "team",
      hasCustomer: false,
      subscriptionStatus: "premium_active",
    });
    expect(v.showContactBillingNoCustomer).toBe(true);
  });
});
