import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Marketing copy must not out-promise what the API enforces.
 *
 * This exists because it had already drifted, in the direction that costs a
 * customer money: the pricing page sold the Team plan as "Unlimited PR
 * analyses" while `try_consume_pr_quota` capped premium orgs at 50 per month
 * and posted "Monthly PR review limit reached" on the pull request. The
 * upgrade nudge was worse -- it offered "unlimited PR reviews" as the reason
 * to upgrade, when free orgs are the ones with unmetered PR reviews and
 * upgrading is what introduces the cap.
 *
 * Nothing connected the two sides, so nothing noticed. These tests are that
 * connection: they read the limits out of the API's own config and assert the
 * copy agrees, in every locale. If someone raises the quota, the pricing page
 * fails until it is updated -- which is the point.
 */

const REPO_ROOT = join(__dirname, "..", "..", "..");
const CONFIG_PY = join(REPO_ROOT, "apps", "api", "driftguard", "core", "config.py");
const MESSAGES_DIR = join(__dirname, "..", "messages");

/** Read an int default out of the pydantic Settings class. */
function apiSettingInt(name: string): number {
  const src = readFileSync(CONFIG_PY, "utf8");
  const m = src.match(new RegExp(`^\\s*${name}\\s*:\\s*int\\s*=\\s*(\\d+)`, "m"));
  if (!m) throw new Error(`${name} not found in config.py — did the setting get renamed?`);
  return Number(m[1]);
}

const LOCALES = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith(".json"));

function messages(locale: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(MESSAGES_DIR, locale), "utf8"));
}

function get(tree: Record<string, unknown>, dotted: string): string {
  let node: unknown = tree;
  for (const part of dotted.split(".")) {
    if (typeof node !== "object" || node === null) {
      throw new Error(`missing key: ${dotted}`);
    }
    node = (node as Record<string, unknown>)[part];
  }
  if (typeof node !== "string") throw new Error(`not a string: ${dotted}`);
  return node;
}

describe("the config values these tests are pinned to still exist", () => {
  it("reads both limits out of config.py", () => {
    // If a rename silently broke the regex, every assertion below would pass
    // against a default and prove nothing.
    expect(apiSettingInt("premium_monthly_pr_limit")).toBeGreaterThan(0);
    expect(apiSettingInt("free_repository_limit")).toBeGreaterThan(0);
  });
});

describe("paid plan copy matches the enforced quota", () => {
  const limit = apiSettingInt("premium_monthly_pr_limit");

  it.each(LOCALES)("%s states the real monthly PR limit", (locale) => {
    const msgs = messages(locale);
    expect(get(msgs, "landing.pricing.plans.team.f1")).toContain(String(limit));
    expect(get(msgs, "marketing.pricingTeaser.teamDesc")).toContain(String(limit));
  });

  it.each(LOCALES)("%s does not sell the paid plan as unlimited", (locale) => {
    const msgs = messages(locale);
    // One term per locale. A single English regex would pass on zh/hi/ar
    // while they still said "unlimited" -- which is exactly how the original
    // claim survived a review.
    const unlimited = /unlimited|ilimitad|无限|असीमित|غير محدود/i;
    for (const key of [
      "landing.pricing.plans.team.f1",
      "landing.pricing.plans.team.f3",
      "marketing.pricingTeaser.teamDesc",
      "dashboard.upgradeNudge",
    ]) {
      expect(get(msgs, key), `${locale} → ${key}`).not.toMatch(unlimited);
    }
  });
});

describe("free plan copy matches the enforced repo limit", () => {
  const repos = apiSettingInt("free_repository_limit");

  it.each(LOCALES)("%s states the real repository limit", (locale) => {
    expect(get(messages(locale), "dashboard.upgradeNudge")).toContain(String(repos));
  });
});

describe("compliance status is not presented as achieved", () => {
  it.each(LOCALES)("%s does not claim plans include SOC 2", (locale) => {
    const footer = get(messages(locale), "landing.pricing.footer");
    // SOC 2 Type II is scheduled, not held. "All plans include SOC 2" read as
    // a shipped feature, and the Arabic and Hindi strings had dropped even the
    // date qualifier that made the English one borderline.
    expect(footer).not.toMatch(/all plans include soc|todos los planes incluyen soc|todos os planes incluem soc/i);
    expect(footer).toMatch(/2026/);
  });
});

describe("unbuilt capabilities are labelled", () => {
  it.each(LOCALES)("%s does not list OPA policy bundles", (locale) => {
    // services/policy_engine.py is a block/warn/alert rule engine. There is no
    // Rego evaluator anywhere in apps/api.
    expect(get(messages(locale), "landing.pricing.plans.team.f4")).not.toMatch(/OPA/);
  });

  it.each(LOCALES)("%s does not state a specific uptime SLA", (locale) => {
    // No uptime measurement exists to back a figure, and Enterprise is a
    // negotiated tier where the SLA belongs in the agreement.
    expect(get(messages(locale), "landing.pricing.plans.enterprise.f5")).not.toMatch(/99[.,]9/);
  });
});
