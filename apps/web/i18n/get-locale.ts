import { cookies, headers } from "next/headers";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
  resolveLocaleFromAcceptLanguage,
  type Locale,
} from "./config";

const messageLoaders: Record<Locale, () => Promise<{ default: Record<string, unknown> }>> = {
  en: () => import("../messages/en.json"),
  zh: () => import("../messages/zh.json"),
  hi: () => import("../messages/hi.json"),
  es: () => import("../messages/es.json"),
  ar: () => import("../messages/ar.json"),
  "pt-BR": () => import("../messages/pt-BR.json"),
};

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(localeCookieName)?.value;
  if (fromCookie && isLocale(fromCookie)) return fromCookie;

  const headerStore = await headers();
  return resolveLocaleFromAcceptLanguage(headerStore.get("accept-language"));
}

export async function getMessages(locale: Locale) {
  const loader = messageLoaders[locale] ?? messageLoaders[defaultLocale];
  return (await loader()).default;
}
