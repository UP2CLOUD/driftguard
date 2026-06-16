import { cache } from "react";
import { cookies } from "next/headers";
import { currencyCookieName, isCurrency } from "@/lib/currency/config";
import { defaultCurrency, type CurrencyCode } from "@/lib/currency/config";
import { getLocale } from "@/i18n/get-locale";
import type { Locale } from "@/i18n/config";
import { themeCookieName, isTheme, defaultTheme, type Theme, type UserPreferences } from "./config";

export const getCurrency = cache(async function getCurrency(): Promise<CurrencyCode> {
  const cookieStore = await cookies();
  const value = cookieStore.get(currencyCookieName)?.value;
  if (value && isCurrency(value)) return value;
  return defaultCurrency;
});

export const getTheme = cache(async function getTheme(): Promise<Theme> {
  const cookieStore = await cookies();
  const value = cookieStore.get(themeCookieName)?.value;
  if (value && isTheme(value)) return value;
  return defaultTheme;
});

export const getUserPreferences = cache(async function getUserPreferences(): Promise<UserPreferences> {
  const [locale, currency, theme] = await Promise.all([getLocale(), getCurrency(), getTheme()]);
  return { locale, currency, theme };
});

export type { Locale, CurrencyCode, Theme, UserPreferences };
