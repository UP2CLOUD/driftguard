/**
 * DriftGuard middleware — auth guard + locale detection + SEO headers.
 *
 * Responsibilities:
 *  1. Redirect unauthenticated users away from /dashboard
 *  2. Detect and persist locale from Accept-Language on first visit
 *  3. Emit hreflang Link headers for SEO crawlers (Googlebot, Bingbot)
 *  4. Set X-Robots-Tag to noindex for private routes
 */
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "./auth.config";
import {
  locales,
  isLocale,
  localeCookieName,
  resolveLocaleFromAcceptLanguage,
} from "./i18n/config";

const { auth } = NextAuth(authConfig);

const BASE = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://driftguard-blue.vercel.app"
).replace(/\/$/, "");

const LOCALE_BCP47: Record<string, string> = {
  en:      "en-US",
  "pt-BR": "pt-BR",
  es:      "es-ES",
  zh:      "zh-CN",
  hi:      "hi-IN",
  ar:      "ar-SA",
};

/** Paths that are public marketing pages (emit hreflang headers). */
const PUBLIC_PATHS = ["/", "/pricing", "/docs", "/customers", "/changelog",
  "/security", "/compliance", "/careers", "/status"];

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.some(p => path === p || path.startsWith(p + "/"));
}

/** Build hreflang Link header value for a given URL. */
function hreflangLinkHeader(url: string): string {
  const parts: string[] = [`<${url}>; rel="alternate"; hreflang="x-default"`];
  for (const locale of locales) {
    const bcp = LOCALE_BCP47[locale];
    if (bcp) parts.push(`<${url}>; rel="alternate"; hreflang="${bcp}"`);
  }
  return parts.join(", ");
}

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn   = !!(req as any).auth;
  const isDashboard  = pathname.startsWith("/dashboard");
  const isApiRoute   = pathname.startsWith("/api/");

  // 1. Auth guard
  const response =
    isDashboard && !isLoggedIn
      ? NextResponse.redirect(new URL("/", req.nextUrl))
      : NextResponse.next();

  // 2. Locale detection (first visit)
  const localeCookie = req.cookies.get(localeCookieName)?.value;
  if (!localeCookie || !isLocale(localeCookie)) {
    const locale = resolveLocaleFromAcceptLanguage(
      req.headers.get("accept-language")
    );
    response.cookies.set(localeCookieName, locale, {
      path:     "/",
      maxAge:   60 * 60 * 24 * 365,
      sameSite: "lax",
      secure:   process.env.NODE_ENV === "production",
    });
  }

  // 3. SEO headers
  if (isPublicPath(pathname)) {
    const fullUrl = `${BASE}${pathname}`;
    // hreflang link headers — helps Googlebot discover locale variants
    response.headers.set("Link", hreflangLinkHeader(fullUrl));
    // Canonical hint via header (belt + suspenders alongside <link> in HTML)
    response.headers.set("X-Canonical-URL", fullUrl);
  }

  // 4. Noindex private routes via header
  if (isDashboard || isApiRoute) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|og/).*)"],
};
