import { describe, it, expect } from "vitest";
import { incidentRootCause, incidentSuggestedFix, incidentTitle } from "./incident-i18n";

/**
 * Reported from production: /dashboard/.../incidents/... showed English body
 * copy under PT-BR. The page chrome was translated; the incident prose was
 * written to the database in English at creation time and rendered verbatim.
 */
describe("incident prose translation", () => {
  it("translates the root cause for pt-BR", () => {
    const out = incidentRootCause("security_finding", "pt-BR");
    expect(out).toBe("Foi detetada uma configuração incorreta ou um padrão inseguro.");
    expect(out).not.toMatch(/misconfiguration/i);
  });

  it("translates the suggested fix for pt-BR", () => {
    expect(incidentSuggestedFix("iam_wildcard", "pt-BR")).toMatch(/Restrinja os recursos/);
  });

  it("covers every locale for every root-cause key", () => {
    const keys = ["policy_blocked", "drift_detected", "security_finding", "cost_alert", "pr_opened", "generic"];
    for (const locale of ["en", "pt-BR", "es", "zh", "hi", "ar"]) {
      for (const k of keys) {
        const v = incidentRootCause(k, locale);
        expect(v, `${k}/${locale}`).toBeTruthy();
        if (locale !== "en") {
          expect(v, `${k}/${locale} untranslated`).not.toBe(incidentRootCause(k, "en"));
        }
      }
    }
  });

  it("covers every locale for every suggested-fix key", () => {
    for (const locale of ["en", "pt-BR", "es", "zh", "hi", "ar"]) {
      for (const k of ["s3_public", "iam_wildcard", "rds_delete", "sg_open_ingress"]) {
        expect(incidentSuggestedFix(k, locale), `${k}/${locale}`).toBeTruthy();
      }
    }
  });

  it("returns null for an unknown key so the caller falls back to stored text", () => {
    expect(incidentRootCause("not_a_key", "pt-BR")).toBeNull();
    expect(incidentSuggestedFix("not_a_key", "pt-BR")).toBeNull();
  });

  it("returns null for a null key (rows written before migration 019)", () => {
    expect(incidentRootCause(null, "pt-BR")).toBeNull();
    expect(incidentSuggestedFix(undefined, "pt-BR")).toBeNull();
  });

  it("falls back to English for an unknown locale rather than returning nothing", () => {
    expect(incidentRootCause("drift_detected", "de")).toBe(
      "Live cloud state diverged from the Terraform plan.",
    );
  });
});

describe("incident title prefix", () => {
  it("translates only the prefix and leaves the message verbatim", () => {
    const t = incidentTitle("Drift detected: aws_s3_bucket.logs changed", "drift_detected", "pt-BR");
    expect(t).toBe("Desvio detetado: aws_s3_bucket.logs changed");
    // resource addresses are identifiers — never translated
    expect(t).toContain("aws_s3_bucket.logs");
  });

  it("covers every locale for every prefix", () => {
    const keys = ["policy_blocked", "drift_detected", "security_finding", "cost_alert", "pr_opened"];
    for (const locale of ["en", "pt-BR", "es", "zh", "hi", "ar"]) {
      for (const k of keys) {
        const out = incidentTitle("PLACEHOLDER", k, locale);
        expect(out, `${k}/${locale}`).toBe("PLACEHOLDER"); // no English prefix → untouched
      }
    }
  });

  it("leaves the title untouched when it lacks the expected English prefix", () => {
    const original = "aws_db_instance.postgres: No encryption configured.";
    expect(incidentTitle(original, "security_finding", "pt-BR")).toBe(original);
  });

  it("leaves the title untouched when the key is missing or unknown", () => {
    expect(incidentTitle("Drift detected: x", null, "pt-BR")).toBe("Drift detected: x");
    expect(incidentTitle("Drift detected: x", "nope", "pt-BR")).toBe("Drift detected: x");
  });

  it("falls back to English for an unknown locale", () => {
    expect(incidentTitle("Cost alert: x", "cost_alert", "de")).toBe("Cost alert: x");
  });
});
