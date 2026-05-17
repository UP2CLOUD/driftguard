import { NextResponse } from "next/server";
import { isCurrency } from "@/lib/currency/config";
import { currencyCookieName } from "@/lib/currency/config";
import { isLocale, localeCookieName } from "@/i18n/config";
import { parsePreferencesFromCookies } from "@/lib/preferences/config";
import { cookies } from "next/headers";

const cookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: false,
};

export async function GET() {
  const cookieStore = await cookies();
  const prefs = parsePreferencesFromCookies(
    cookieStore.get(localeCookieName)?.value,
    cookieStore.get(currencyCookieName)?.value
  );
  return NextResponse.json(prefs);
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { locale?: string; currency?: string };

  if (body.locale !== undefined && !isLocale(body.locale)) {
    return NextResponse.json({ error: "invalid locale" }, { status: 400 });
  }
  if (body.currency !== undefined && !isCurrency(body.currency)) {
    return NextResponse.json({ error: "invalid currency" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const nextLocale = body.locale ?? cookieStore.get(localeCookieName)?.value;
  const nextCurrency = body.currency ?? cookieStore.get(currencyCookieName)?.value;
  const prefs = parsePreferencesFromCookies(nextLocale, nextCurrency);

  const response = NextResponse.json(prefs);
  if (body.locale !== undefined) {
    response.cookies.set(localeCookieName, body.locale, cookieOptions);
  }
  if (body.currency !== undefined) {
    response.cookies.set(currencyCookieName, body.currency, cookieOptions);
  }

  return response;
}
