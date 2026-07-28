import { describe, it, expect } from "vitest";
import { formatDate, formatDateTime, formatTime } from "./format-date";

describe("formatDate", () => {
  it("returns an empty string for null/undefined/empty input", () => {
    expect(formatDate(null, "en")).toBe("");
    expect(formatDate(undefined, "en")).toBe("");
    expect(formatDate("", "en")).toBe("");
  });

  it("formats a valid ISO date to a non-empty localized string", () => {
    const out = formatDate("2026-01-15T00:00:00Z", "en");
    expect(out).toBeTruthy();
    expect(out).toContain("2026");
  });

  it("returns the raw input when the date is unparseable", () => {
    expect(formatDate("not-a-date", "en")).toBe("not-a-date");
  });
});

describe("formatDateTime / formatTime", () => {
  it("return empty strings for nullish input", () => {
    expect(formatDateTime(null, "en")).toBe("");
    expect(formatTime(undefined, "en")).toBe("");
  });
});
