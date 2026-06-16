import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency/config";
import { currencyCookieName } from "@/lib/currency/config";
import { isLocale, localeCookieName } from "@/i18n/config";
import { isTheme, themeCookieName, parsePreferencesFromCookies } from "@/lib/preferences/config";
import { cookies } from "next/headers";

const cookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: false,
  secure: process.env.NODE_ENV === "production",
};

export async function GET() {
  const cookieStore = await cookies();
  const prefs = parsePreferencesFromCookies(
    cookieStore.get(localeCookieName)?.value,
    cookieStore.get(currencyCookieName)?.value,
    cookieStore.get(themeCookieName)?.value,
  );
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { locale?: string; currency?: string; theme?: string };

  if (body.locale !== undefined && !isLocale(body.locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  if (body.currency !== undefined && !isCurrency(body.currency)) {
    return NextResponse.json({ error: "invalid currency" }, { status: 400 });
  }
  if (body.theme !== undefined && !isTheme(body.theme)) {
    return NextResponse.json({ error: "invalid theme" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const nextLocale = body.locale ?? cookieStore.get(localeCookieName)?.value;
  const nextCurrency = body.currency ?? cookieStore.get(currencyCookieName)?.value;
  const nextTheme = body.theme ?? cookieStore.get(themeCookieName)?.value;
  const prefs = parsePreferencesFromCookies(nextLocale, nextCurrency, nextTheme);

  const response = NextResponse.json(prefs);
  if (body.locale !== undefined) {
    response.cookies.set(localeCookieName, body.locale, cookieOptions);
  }
  if (body.currency !== undefined) {
    response.cookies.set(currencyCookieName, body.currency, cookieOptions);
  }
  if (body.theme !== undefined) {
    response.cookies.set(themeCookieName, body.theme, cookieOptions);
  }

  return response;
}
