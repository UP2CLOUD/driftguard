"use client";

import { createContext, useContext, type ReactNode } from "react";
import { createTranslator } from "@/i18n/translator";
import type { Locale } from "@/i18n/config";

type Messages = Record<string, unknown>;

const I18nContext = createContext<{
  locale: Locale;
  t: ReturnType<typeof createTranslator>;
} | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: Locale;
  messages: Messages;
  children: ReactNode;
}) {
  const t = createTranslator(messages);
  return <I18nContext.Provider value={{ locale, t }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used within I18nProvider");
  return ctx.t;
}
