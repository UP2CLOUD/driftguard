import type { Locale } from "@/i18n/config";

/** Map DriftGuard locale keys to BCP-47 tags accepted by Intl. */
const LOCALE_MAP: Record<Locale, string> = {
  en: "en-GB",
  "pt-BR": "pt-BR",
  es: "es-ES",
  zh: "zh-CN",
  hi: "hi-IN",
  ar: "ar-SA",
};

function intlLocale(locale: string): string {
  return LOCALE_MAP[locale as Locale] ?? locale;
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(intlLocale(locale));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString(intlLocale(locale));
  } catch {
    return iso;
  }
}

export function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleTimeString(intlLocale(locale));
  } catch {
    return iso;
  }
}
