import { describe, it, expect } from "vitest";
import { isWaitlistConfigured } from "./waitlist";

/**
 * The waitlist route used to claim success (`{ ok: true }`, button shows
 * "✓ In") whenever RESEND_API_KEY or RESEND_AUDIENCE_ID was unset, having
 * only logged the email with console.log -- not a durable record on an
 * edge runtime. This pins the gate that now makes the route fail instead
 * of lying about it.
 */
describe("isWaitlistConfigured", () => {
  it("is true only when both the key and the audience id are present", () => {
    expect(isWaitlistConfigured("re_123", "aud_456")).toBe(true);
  });

  it("is false when the API key is missing", () => {
    expect(isWaitlistConfigured(undefined, "aud_456")).toBe(false);
  });

  it("is false when the audience id is missing", () => {
    expect(isWaitlistConfigured("re_123", undefined)).toBe(false);
  });

  it("is false when both are missing", () => {
    expect(isWaitlistConfigured(undefined, undefined)).toBe(false);
  });

  it("is false for empty-string values, not just undefined", () => {
    // process.env entries are "" when set-but-blank, not undefined -- a
    // misconfigured deploy secret is a realistic way to hit this.
    expect(isWaitlistConfigured("", "aud_456")).toBe(false);
    expect(isWaitlistConfigured("re_123", "")).toBe(false);
  });
});
