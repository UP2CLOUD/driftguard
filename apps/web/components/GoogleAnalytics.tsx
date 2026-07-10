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
 * - Google Consent Mode v2 defaults to "denied"; storage is only granted
 *   after the user accepts in the cookie banner (synced live via CONSENT_EVENT).
 * - SPA page_views are sent manually on route change (config uses
 *   send_page_view:false) so client-side navigation is tracked.
 */
export function GoogleAnalytics() {
  const pathname = usePathname();

  // Manual page_view on every client-side route change.
  useEffect(() => {
    if (!analyticsEnabled || !pathname) return;
    pageview(pathname);
  }, [pathname]);

  // Keep Google Consent Mode in sync with the stored cookie choice.
  useEffect(() => {
    if (!analyticsEnabled) return;
    const apply = () => updateConsent(localStorage.getItem(CONSENT_KEY) === "accepted");
    apply();
    window.addEventListener(CONSENT_EVENT, apply);
    return () => window.removeEventListener(CONSENT_EVENT, apply);
  }, []);

  if (!analyticsEnabled) return null;

  const primaryId = GA_MEASUREMENT_ID || GOOGLE_ADS_ID;

  return (
    <>
      <Script
        id="gtag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${primaryId}`}
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
            wait_for_update: 500
          });
          ${GA_MEASUREMENT_ID ? `gtag('config', '${GA_MEASUREMENT_ID}', { send_page_view: false });` : ""}
          ${GOOGLE_ADS_ID ? `gtag('config', '${GOOGLE_ADS_ID}');` : ""}
        `}
      </Script>
    </>
  );
}
