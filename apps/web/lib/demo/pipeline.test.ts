import { describe, it, expect } from "vitest";
import { PIPELINE_STEPS, overallVerdict, type Verdict } from "./pipeline";

describe("demo pipeline sequencing", () => {
  it("runs the analyses in the documented order", () => {
    expect(PIPELINE_STEPS.map((s) => s.stage)).toEqual([
      "PLAN_PARSED",
      "COST_DELTA",
      "SECURITY_SCAN",
      "DRIFT_CHECK",
      "MEMORY_RECALL",
      "POLICY_EVAL",
    ]);
  });

  it("only uses valid verdicts", () => {
    const valid: Verdict[] = ["ALLOW", "WARN", "BLOCK"];
    for (const step of PIPELINE_STEPS) {
      expect(valid).toContain(step.verdict);
    }
  });
});

describe("overallVerdict (policy outcome)", () => {
  it("is ALLOW when every step allows", () => {
    expect(overallVerdict([{ verdict: "ALLOW" }, { verdict: "ALLOW" }])).toBe("ALLOW");
  });

  it("escalates to WARN when a step warns but none block", () => {
    expect(overallVerdict([{ verdict: "ALLOW" }, { verdict: "WARN" }])).toBe("WARN");
  });

  it("escalates to BLOCK when any step blocks", () => {
    expect(overallVerdict([{ verdict: "WARN" }, { verdict: "BLOCK" }, { verdict: "ALLOW" }])).toBe("BLOCK");
  });

  it("treats an empty sequence as ALLOW", () => {
    expect(overallVerdict([])).toBe("ALLOW");
  });

  it("blocks on the real demo sequence (public-acl + policy)", () => {
    expect(overallVerdict(PIPELINE_STEPS)).toBe("BLOCK");
  });
});
