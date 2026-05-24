/**
 * Re-exports needed by sitemap.ts without importing from lib/seo
 * (avoids the server-only import chain in the edge sitemap route).
 */
export { locales } from "./config";

import { type Locale, locales } from "./config";

export const LOCALE_BCP47_MAP: Record<Locale, string> = {
  en:      "en-US",
  "pt-BR": "pt-BR",
  es:      "es-ES",
  zh:      "zh-CN",
  hi:      "hi-IN",
  ar:      "ar-SA",
};
