import { cache } from "react";
import { cookies } from "next/headers";
import { currencyCookieName, isCurrency } from "@/lib/currency/config";
import { defaultCurrency, type CurrencyCode } from "@/lib/currency/config";
import { getLocale } from "@/i18n/get-locale";
import type { Locale } from "@/i18n/config";
import type { UserPreferences } from "./config";

export const getCurrency = cache(async function getCurrency(): Promise<CurrencyCode> {
  const cookieStore = await cookies();
  const value = cookieStore.get(currencyCookieName)?.value;
  if (value && isCurrency(value)) return value;
  return defaultCurrency;
});

export const getUserPreferences = cache(async function getUserPreferences(): Promise<UserPreferences> {
  const [locale, currency] = await Promise.all([getLocale(), getCurrency()]);
  return { locale, currency };
});

export type { Locale, CurrencyCode, UserPreferences };
