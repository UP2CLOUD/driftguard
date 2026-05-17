import type { Locale } from "@/i18n/config";
import type { CurrencyCode } from "./config";
import { getUsdExchangeRates } from "./rates";

const localeFormatMap: Record<Locale, string> = {
  en: "en-US",
  zh: "zh-CN",
  hi: "hi-IN",
  es: "es-ES",
  ar: "ar-SA",
  "pt-BR": "pt-BR",
};

export function localeToIntlLocale(locale: Locale): string {
  return localeFormatMap[locale] ?? "en-US";
}

/** Convert USD cents (Infracost base) to display currency amount in major units. */
export function convertUsdCentsToCurrency(
  usdCents: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>
): number {
  const usdMajor = usdCents / 100;
  const rate = rates[currency] ?? 1;
  return usdMajor * rate;
}

export function formatCurrency(
  amountMajor: number,
  currency: CurrencyCode,
  locale: Locale,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const digits =
    currency === "JPY"
      ? { minimumFractionDigits: 0, maximumFractionDigits: 0 }
      : { minimumFractionDigits: 2, maximumFractionDigits: 2 };

  return new Intl.NumberFormat(localeToIntlLocale(locale), {
    style: "currency",
    currency,
    ...digits,
    ...options,
  }).format(amountMajor);
}

/** Format monthly cost delta stored as USD cents. */
export function formatCostDeltaCents(
  usdCents: number | null,
  currency: CurrencyCode,
  locale: Locale,
  rates: Record<CurrencyCode, number>
): string {
  if (usdCents === null) return "—";

  const converted = convertUsdCentsToCurrency(usdCents, currency, rates);
  const formatted = formatCurrency(Math.abs(converted), currency, locale);
  const sign = usdCents > 0 ? "+" : usdCents < 0 ? "-" : "";
  return `${sign}${formatted}/mo`;
}

export async function formatCostDeltaCentsForUser(
  usdCents: number | null,
  currency: CurrencyCode,
  locale: Locale
): Promise<string> {
  const rates = await getUsdExchangeRates();
  return formatCostDeltaCents(usdCents, currency, locale, rates);
}
