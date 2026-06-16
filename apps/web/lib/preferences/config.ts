import type { CurrencyCode } from "@/lib/currency/config";
import { currencyCookieName, defaultCurrency, isCurrency } from "@/lib/currency/config";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/i18n/config";

export type Theme = "dark" | "light" | "system";

export const themeCookieName = "dg-theme";
export const defaultTheme: Theme = "dark";

export function isTheme(value: string): value is Theme {
  return value === "dark" || value === "light" || value === "system";
}

export type UserPreferences = {
  locale: Locale;
  currency: CurrencyCode;
  theme: Theme;
};

export { localeCookieName, currencyCookieName, defaultLocale, defaultCurrency };

export function parsePreferencesFromCookies(
  localeValue: string | undefined,
  currencyValue: string | undefined,
  themeValue: string | undefined,
): UserPreferences {
  return {
    locale: localeValue && isLocale(localeValue) ? localeValue : defaultLocale,
    currency: currencyValue && isCurrency(currencyValue) ? currencyValue : defaultCurrency,
    theme: themeValue && isTheme(themeValue) ? themeValue : defaultTheme,
  };
}
