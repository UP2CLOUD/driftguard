import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "./auth.config";
import {
  isLocale,
  localeCookieName,
  resolveLocaleFromAcceptLanguage,
} from "./i18n/config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isOnDashboard = req.nextUrl.pathname.startsWith("/dashboard");

  const response =
    isOnDashboard && !isLoggedIn
      ? NextResponse.redirect(new URL("/", req.nextUrl))
      : NextResponse.next();

  const localeCookie = req.cookies.get(localeCookieName)?.value;
  if (!localeCookie || !isLocale(localeCookie)) {
    const locale = resolveLocaleFromAcceptLanguage(req.headers.get("accept-language"));
    response.cookies.set(localeCookieName, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
