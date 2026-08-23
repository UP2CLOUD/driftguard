/**
 * Pure derivation logic for the public /status page.
 *
 * Extracted out of app/status/page.tsx (a server component, which can't be
 * unit tested directly) so the one property that actually matters here —
 * "an unreachable backend must never render as operational" — has a test
 * pinned to it instead of living only in JSX that nothing exercises.
 *
 * The bug this replaces: `checkToStatus(undefined)` used to return
 * "operational" (the guard was `if (!val || val === "ok")`), and the page's
 * top-level banner used `ready === null ? true : ready.status === "ok"` — so
 * a fetch failure and a healthy backend rendered identically. A status page
 * that says "all systems operational" when it cannot reach its own backend
 * is worse than no status page.
 */

export type SystemStatus = "operational" | "degraded" | "outage" | "unknown";

/**
 * `val` is `undefined` in exactly one case: the backend was unreachable, so
 * the `checks` object it would have populated is `{}`. That must map to
 * "unknown", not "operational" — those are different claims and only one of
 * them is true.
 */
export function checkToStatus(val: string | undefined): SystemStatus {
  if (val === undefined) return "unknown";
  if (val === "ok") return "operational";
  // Backend returns "not_configured" or "not_configured: FIELD1, FIELD2" —
  // an integration a deployment intentionally omitted is not a fault.
  if (val === "not_configured" || val.startsWith("not_configured:")) return "operational";
  if (val.startsWith("error")) return "outage";
  return "degraded";
}

export type BannerTone = "operational" | "degraded" | "unknown";

/**
 * `reachable` and `allOperational` are deliberately separate booleans at the
 * call site, not one collapsed into the other, because they answer different
 * questions: "did we get an answer" and "was the answer good". Collapsing
 * them (as the original `ready === null ? true : ...` did) is exactly how
 * "no answer" became indistinguishable from "good answer".
 */
export function deriveBannerTone(reachable: boolean, allOperational: boolean): BannerTone {
  if (!reachable) return "unknown";
  return allOperational ? "operational" : "degraded";
}

/**
 * Deliberately does NOT use the backend's `ready.status` field. That field
 * exists to answer a different question -- "should Cloud Run route traffic
 * to this replica" -- and ai_review failing never flips it, by design (a
 * third-party integration being unhealthy must not take the pod out of
 * rotation; see api/v1/health.py). Reusing it here reproduced exactly the
 * bug this page was built to fix: both LLM providers down produced a red
 * "Outage" badge on the AI Review row directly under a green "All Systems
 * Operational" banner, because the banner trusted `ready.status` while the
 * row trusted `checks.ai_review`. Deriving the banner from the same
 * per-system statuses the rows render makes that contradiction structurally
 * impossible, for this check and any future one added to SYSTEMS.
 */
export function deriveAllOperational(reachable: boolean, systemStatuses: SystemStatus[]): boolean {
  return reachable && systemStatuses.every((s) => s === "operational");
}
