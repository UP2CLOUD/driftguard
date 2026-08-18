import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * The audit flagged that privacy/terms carry an entity name and email but no
 * registered postal address -- thin for GDPR Art. 13(1)(a). The address is now
 * configurable, and the important property is that an *unset* value ships
 * nothing rather than a placeholder: a fabricated address in a legal document
 * is worse than a missing one.
 */
async function loadLegal(address?: string) {
  vi.resetModules();
  if (address === undefined) {
    delete process.env.NEXT_PUBLIC_LEGAL_ADDRESS;
  } else {
    process.env.NEXT_PUBLIC_LEGAL_ADDRESS = address;
  }
  return import("./legal-content");
}

function allText(doc: { sections: { paragraphs: string[] }[] }): string {
  return doc.sections.flatMap((s) => s.paragraphs).join("\n");
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_LEGAL_ADDRESS;
  vi.resetModules();
});

describe("registered address in legal documents", () => {
  it("omits the address clause entirely when unset", async () => {
    const { privacyPolicy, termsOfService } = await loadLegal(undefined);
    expect(allText(privacyPolicy)).not.toContain("Registered address");
    expect(allText(termsOfService)).not.toContain("Registered address");
  });

  it("omits the clause when set to whitespace only", async () => {
    const { privacyPolicy } = await loadLegal("   ");
    expect(allText(privacyPolicy)).not.toContain("Registered address");
  });

  it("includes the address in the privacy policy when configured", async () => {
    const addr = "Rua Example 1, 1000-001 Lisboa, Portugal";
    const { privacyPolicy } = await loadLegal(addr);
    expect(allText(privacyPolicy)).toContain(`Registered address: ${addr}.`);
  });

  it("includes the address in the terms when configured", async () => {
    const addr = "Rua Example 1, 1000-001 Lisboa, Portugal";
    const { termsOfService } = await loadLegal(addr);
    expect(allText(termsOfService)).toContain(`Registered address: ${addr}.`);
  });

  it("keeps the email contact regardless of the address setting", async () => {
    const withOut = await loadLegal(undefined);
    expect(allText(withOut.privacyPolicy)).toContain("privacy@driftguard.io");
    const withIn = await loadLegal("Somewhere 1, Lisboa");
    expect(allText(withIn.privacyPolicy)).toContain("privacy@driftguard.io");
  });
});
