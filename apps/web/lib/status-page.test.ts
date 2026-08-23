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
  it("is false when the backend was unreachable, regardless of a stale ready value", () => {
    expect(deriveAllOperational(false, "ok")).toBe(false);
  });

  it("is true only when reachable and status is ok", () => {
    expect(deriveAllOperational(true, "ok")).toBe(true);
  });

  it("is false when reachable but degraded", () => {
    expect(deriveAllOperational(true, "degraded")).toBe(false);
  });

  it("is false when reachable is true but no status was parsed", () => {
    expect(deriveAllOperational(true, null)).toBe(false);
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
