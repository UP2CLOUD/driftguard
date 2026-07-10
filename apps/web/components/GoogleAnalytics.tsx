"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import {
  GA_MEASUREMENT_ID,
  GOOGLE_ADS_ID,
  analyticsEnabled,
  pageview,
  updateConsent,
} from "@/lib/gtag";
import { CONSENT_KEY, CONSENT_EVENT } from "@/lib/consent";

/**
 * Loads Google Analytics 4 and/or Google Ads (gtag.js), GDPR-compliant:
 *
 * - Renders nothing unless NEXT_PUBLIC_GA_MEASUREMENT_ID or
 *   NEXT_PUBLIC_GOOGLE_ADS_ID is set.
 * - A synchronous inline bootstrap script defines `gtag` and sets Google
 *   Consent Mode v2 *default* BEFORE gtag.js loads, reading the stored cookie
 *   choice from localStorage. This avoids a race where a returning user who
 *   already accepted would be re-defaulted to "denied". New/declined users
 *   default to "denied" until they accept.
 * - Live consent changes (accept/decline in the banner) are applied via the
 *   CONSENT_EVENT listener.
 * - SPA page_views are sent manually on route change (config uses
 *   send_page_view:false).
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  // Manual page_view on every client-side route change. gtag is already defined
  // by the synchronous bootstrap script below, so the initial view isn't lost.
  useEffect(() => {
    if (!analyticsEnabled || !pathname) return;
    pageview(pathname);
  }, [pathname]);

  // Apply *live* consent changes only — the initial state is set synchronously
  // in the bootstrap script, so there is no gtag-not-ready race here.
  useEffect(() => {
    if (!analyticsEnabled) return;
    const onChange = (e: Event) =>
      updateConsent((e as CustomEvent<string>).detail === "accepted");
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!analyticsEnabled) return null;

  const primaryId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;

  const configLines = [
    GA_MEASUREMENT_ID ? `gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false});` : "",
    GOOGLE_ADS_ID ? `gtag('config','${GOOGLE_ADS_ID}');` : "",
  ].join("");

  // Runs during HTML parse — before hydration, useEffect, and gtag.js.
  const bootstrap = `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
var __c = 'denied';
try { if (localStorage.getItem('${CONSENT_KEY}') === 'accepted') __c = 'granted'; } catch (e) {}
gtag('js', new Date());
gtag('consent', 'default', {
  analytics_storage: __c,
  ad_storage: __c,
  ad_user_data: __c,
  ad_personalization: __c,
  wait_for_update: 500
});
${configLines}
`.trim();

  return (
    <>
      <script id="gtag-bootstrap" dangerouslySetInnerHTML={{ __html: bootstrap }} />
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
      />
    </>
  );
}
