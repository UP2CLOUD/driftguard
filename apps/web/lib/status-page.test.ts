import { describe, it, expect } from "vitest";
import { checkToStatus, deriveBannerTone, deriveAllOperational } from "./status-page";

/**
 * The status page used to treat "couldn't reach the backend" as
 * "operational": `checkToStatus(undefined)` returned "operational", and the
 * page banner computed `ready === null ? true : ready.status === "ok"`. A
 * visitor checking the status page during an actual outage that also took
 * out connectivity to the backend would have seen a green "all systems
 * operational" banner. These tests exist to make that regression loud.
 */

describe("checkToStatus", () => {
  it("maps an unreachable backend (undefined) to unknown, never operational", () => {
    expect(checkToStatus(undefined)).toBe("unknown");
  });

  it("maps ok to operational", () => {
    expect(checkToStatus("ok")).toBe("operational");
  });

  it("maps not_configured to operational (an omitted integration is not a fault)", () => {
    expect(checkToStatus("not_configured")).toBe("operational");
  });

  it("maps a not_configured reason string to operational", () => {
    expect(checkToStatus("not_configured: GITHUB_WEBHOOK_SECRET")).toBe("operational");
  });

  it("maps any error-prefixed value to outage", () => {
    expect(checkToStatus("error: connection refused")).toBe("outage");
    expect(checkToStatus("error: falling back to static summary — quota exceeded")).toBe("outage");
  });

  it("maps anything else to degraded", () => {
    expect(checkToStatus("some-unexpected-value")).toBe("degraded");
  });
});

describe("deriveAllOperational", () => {
  it("is false when the backend was unreachable, regardless of the system statuses", () => {
    expect(deriveAllOperational(false, ["operational", "operational"])).toBe(false);
  });

  it("is true only when reachable and every system is operational", () => {
    expect(deriveAllOperational(true, ["operational", "operational", "operational"])).toBe(true);
  });

  it("is false when any single system is degraded, outage, or unknown", () => {
    expect(deriveAllOperational(true, ["operational", "degraded"])).toBe(false);
    expect(deriveAllOperational(true, ["operational", "outage"])).toBe(false);
    expect(deriveAllOperational(true, ["operational", "unknown"])).toBe(false);
  });

  it("is true for an empty system list (vacuous truth is fine — SYSTEMS is never actually empty)", () => {
    expect(deriveAllOperational(true, [])).toBe(true);
  });

  it("regression: the AI-review row going to outage must flip the banner, not just its own row", () => {
    // This is the exact incident ai_health.py exists to surface: both LLM
    // providers down. The backend's /ready still returns HTTP 200 with
    // status "ok" for routing purposes (a third-party integration failing
    // must not take the pod out of rotation) -- so the banner must be
    // derived from the same per-row statuses the page renders, not from
    // that routing-oriented field, or the banner and the AI Review row
    // contradict each other on screen.
    const systemStatuses = ["operational", "operational", "operational", "outage", "operational"] as const;
    expect(deriveAllOperational(true, [...systemStatuses])).toBe(false);
  });
});

describe("deriveBannerTone", () => {
  it("is unknown when unreachable, even if allOperational was somehow true", () => {
    // Guards the exact shape of the original bug: unreachable must win over
    // any other signal, not be overridden by a stale/default "operational".
    expect(deriveBannerTone(false, true)).toBe("unknown");
  });

  it("is operational when reachable and all systems ok", () => {
    expect(deriveBannerTone(true, true)).toBe("operational");
  });

  it("is degraded when reachable but not all systems ok", () => {
    expect(deriveBannerTone(true, false)).toBe("degraded");
  });

  it("never returns operational when reachable is false, for any allOperational input", () => {
    for (const all of [true, false]) {
      expect(deriveBannerTone(false, all)).not.toBe("operational");
    }
  });
});
