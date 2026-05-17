export const locales = ["en", "zh", "hi", "es", "ar", "pt-BR"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeCookieName = "dg_locale";

export const rtlLocales: Locale[] = ["ar"];

export function isRtlLocale(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/** Map browser language tags to supported locales. */
const browserLocaleMap: Record<string, Locale> = {
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  zh: "zh",
  "zh-cn": "zh",
  "zh-hans": "zh",
  "zh-hk": "zh",
  "zh-tw": "zh",
  hi: "hi",
  es: "es",
  "es-es": "es",
  "es-mx": "es",
  ar: "ar",
  "ar-sa": "ar",
  pt: "pt-BR",
  "pt-br": "pt-BR",
};

export function resolveLocaleFromAcceptLanguage(header: string | null): Locale {
  if (!header) return defaultLocale;

  const parts = header.split(",").map((part) => {
    const [tag, qPart] = part.trim().split(";");
    const q = qPart?.startsWith("q=") ? parseFloat(qPart.slice(2)) : 1;
    return { tag: tag.toLowerCase(), q: Number.isFinite(q) ? q : 0 };
  });

  parts.sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    if (browserLocaleMap[tag]) return browserLocaleMap[tag];
    const base = tag.split("-")[0];
    if (browserLocaleMap[base]) return browserLocaleMap[base];
  }

  return defaultLocale;
}

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}
