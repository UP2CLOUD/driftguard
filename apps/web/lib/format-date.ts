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

function parse(iso: string): Date | null {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = parse(iso);
  if (!d) return iso; // unparseable — show the raw value rather than "Invalid Date"
  try {
    return d.toLocaleDateString(intlLocale(locale));
  } catch {
    return iso;
  }
}

export function formatDateTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = parse(iso);
  if (!d) return iso;
  try {
    return d.toLocaleString(intlLocale(locale));
  } catch {
    return iso;
  }
}

export function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return "";
  const d = parse(iso);
  if (!d) return iso;
  try {
    return d.toLocaleTimeString(intlLocale(locale));
  } catch {
    return iso;
  }
}
