export const CONSENT_KEY = "dg_cookie_consent";

/** Window event dispatched when the user changes their cookie choice, so
 *  analytics loaders (Google Consent Mode, PostHog) can react live. */
export const CONSENT_EVENT = "dg-consent-changed";

export type ConsentValue = "accepted" | "declined";

/** Persist the user's cookie choice and notify listeners in the same tab. */
export function setConsent(value: ConsentValue): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CONSENT_KEY, value);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
}

/** Current stored choice, or null if the user hasn't chosen yet. */
export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  const v = localStorage.getItem(CONSENT_KEY);
  return v === "accepted" || v === "declined" ? v : null;
}
