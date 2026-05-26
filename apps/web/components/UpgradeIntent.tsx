"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

/** Auto-triggers Stripe checkout when ?intent=upgrade-team is in the URL. */
export function UpgradeIntent({ installationId }: { installationId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const intent = params.get("intent");
  const fired = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (intent !== "upgrade-team" || fired.current) return;
    fired.current = true;

    (async () => {
      try {
        const me = await fetch("/api/me/installation");
        if (!me.ok) throw new Error("Could not resolve installation");
        const { orgId } = await me.json();
        if (!orgId) {
          setError("Organization not fully provisioned. Try again in a few seconds.");
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
            router.replace(`/dashboard/${installationId}`);
            return;
          }
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Checkout failed");
        }
        const { url } = await res.json();
        if (url) window.location.href = url;
        else throw new Error("No checkout URL returned");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Checkout failed");
        router.replace(`/dashboard/${installationId}`);
      }
    })();
  }, [intent, installationId, router]);

  if (!error) return null;
  return (
    <div className="mb-4 rounded-md border border-warned/30 bg-warned/5 px-4 py-2.5 font-mono text-[11px] text-warned">
      {error}
    </div>
  );
}
