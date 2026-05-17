import type { CurrencyCode } from "@/lib/currency/config";
import { currencyCookieName, defaultCurrency, isCurrency } from "@/lib/currency/config";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  type Locale,
} from "@/i18n/config";

export type UserPreferences = {
  locale: Locale;
  currency: CurrencyCode;
};

export { localeCookieName, currencyCookieName, defaultLocale, defaultCurrency };

export function parsePreferencesFromCookies(
  localeValue: string | undefined,
  currencyValue: string | undefined
): UserPreferences {
  return {
    locale: localeValue && isLocale(localeValue) ? localeValue : defaultLocale,
    currency:
      currencyValue && isCurrency(currencyValue) ? currencyValue : defaultCurrency,
  };
}
