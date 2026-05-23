"use client";

import { createContext, useContext, useMemo } from "react";
import { createTranslator } from "@/i18n/translator";

type TFn = ReturnType<typeof createTranslator>;

const TranslationContext = createContext<TFn | null>(null);

/**
 * Provides translations to all client-side landing components.
 * Rendered in app/page.tsx (server) with pre-fetched messages.
 * Client components call useT() — no prop drilling needed.
 */
export function TranslationProvider({
  messages,
  children,
}: {
  messages: Record<string, unknown>;
  children: React.ReactNode;
}) {
  const t = useMemo(() => createTranslator(messages), [messages]);
  return (
    <TranslationContext.Provider value={t}>
      {children}
    </TranslationContext.Provider>
  );
}

/** Use in any client component to access translations. */
export function useT(): TFn {
  const t = useContext(TranslationContext);
  if (!t) throw new Error("useT must be used inside TranslationProvider");
  return t;
}
