// Google Analytics 4 + Google Ads (gtag.js) helpers.
//
// IDs are optional. When neither is set, `analyticsEnabled` is false, no
// script loads, and every helper is a no-op — the app degrades gracefully.
//
//   NEXT_PUBLIC_GA_MEASUREMENT_ID  → GA4 property   (e.g. "G-XXXXXXXXXX")
//   NEXT_PUBLIC_GOOGLE_ADS_ID      → Google Ads tag (e.g. "AW-XXXXXXXXXX")

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export const GOOGLE_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID ?? "";

export const analyticsEnabled = Boolean(GA_MEASUREMENT_ID || GOOGLE_ADS_ID);

type GtagArgs = [command: string, ...rest: unknown[]];

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: GtagArgs) => void;
  }
}

function gtag(...args: GtagArgs): void {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag(...args);
}

/** Send a SPA page_view to GA4 on client-side route changes. */
export function pageview(path: string): void {
  if (!GA_MEASUREMENT_ID) return;
  gtag("event", "page_view", {
    page_path: path,
    page_location: typeof window !== "undefined" ? window.location.href : undefined,
  });
}

/** Generic GA4 event. */
export function trackEvent(name: string, params: Record<string, unknown> = {}): void {
  gtag("event", name, params);
}

/**
 * Google Ads conversion. Pass the full `send_to` string ("AW-XXXX/label").
 * No-ops when the Ads tag isn't configured.
 */
export function trackConversion(sendTo: string, params: Record<string, unknown> = {}): void {
  if (!GOOGLE_ADS_ID) return;
  gtag("event", "conversion", { send_to: sendTo, ...params });
}

/** Update Google Consent Mode v2 to reflect the user's cookie choice. */
export function updateConsent(granted: boolean): void {
  const v = granted ? "granted" : "denied";
  gtag("consent", "update", {
    analytics_storage: v,
    ad_storage: v,
    ad_user_data: v,
    ad_personalization: v,
  });
}
