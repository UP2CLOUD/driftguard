import { describe, it, expect } from "vitest";
import { SCENARIOS, scenarioVerdict } from "./scenarios";

describe("simulator scenarios", () => {
  it("has at least one scenario per verdict tier", () => {
    const verdicts = new Set(SCENARIOS.map(scenarioVerdict));
    expect(verdicts.has("ALLOW")).toBe(true);
    expect(verdicts.has("WARN")).toBe(true);
    expect(verdicts.has("BLOCK")).toBe(true);
  });

  it("every scenario runs all six real analysis engines in order", () => {
    const expectedOrder = ["plan", "cost", "security", "drift", "recall", "policy"];
    for (const scenario of SCENARIOS) {
      expect(scenario.engines.map((e) => e.key)).toEqual(expectedOrder);
    }
  });

  it("has a unique id and rule for every scenario", () => {
    const ids = SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scenario of SCENARIOS) {
      expect(scenario.rule.length).toBeGreaterThan(0);
      expect(scenario.explanation.length).toBeGreaterThan(0);
    }
  });

  it("computes the documented worst-case verdict for each scenario", () => {
    const blocked = SCENARIOS.find((s) => s.id === "public-bucket")!;
    expect(scenarioVerdict(blocked)).toBe("BLOCK");

    const clean = SCENARIOS.find((s) => s.id === "clean-read-replica")!;
    expect(scenarioVerdict(clean)).toBe("ALLOW");

    const warned = SCENARIOS.find((s) => s.id === "rds-cost-spike")!;
    expect(scenarioVerdict(warned)).toBe("WARN");
  });
});
