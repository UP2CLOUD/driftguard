"use client";

/**
 * PricingCta — Team plan checkout flow.
 *
 * Signed-out → /auth/signin?callbackUrl=/dashboard?intent=upgrade-team
 * Signed-in  → POST /api/billing/checkout → redirect to Stripe Checkout
 *
 * Other plans (OSS, Enterprise) pass through to the original href.
 */

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  tier: "oss" | "team" | "enterprise"; // lowercase keys from PLANS
  href: string;            // fallback for non-checkout plans
  external?: boolean;
  className: string;
  label: string;
};

export function PricingCta({ tier, href, external, className, label }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Non-Team plans → straight link
  if (tier !== "team") {
    return (
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noreferrer" : undefined}
        className={className}
      >
        {label}
      </a>
    );
  }

  async function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();

    if (status !== "authenticated") {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent("/dashboard?intent=upgrade-team")}`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/me/installation");
      if (!meRes.ok) {
        // Not provisioned yet → send through GitHub App install
        window.location.href = href;
        return;
      }
      const { orgId, installationId } = await meRes.json();
      if (!orgId || !installationId) {
        window.location.href = href;
        return;
      }

      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan: "team", installationId }),
      });

      if (!res.ok) {
        if (res.status === 503) {
          setError("Billing is not yet enabled. Contact sales@driftguard.io.");
          return;
        }
        const body = await res.json().catch(() => ({}));
        setError(body.error || "Checkout failed");
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setError("No checkout URL returned");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <a
        href={href}
        onClick={handleClick}
        className={`${className} ${loading ? "opacity-60 pointer-events-none" : ""}`}
        aria-busy={loading}
      >
        {loading ? "…" : label}
      </a>
      {error && (
        <p className="mt-2 font-sans font-medium text-[10px] text-blocked text-center">{error}</p>
      )}
    </>
  );
}
