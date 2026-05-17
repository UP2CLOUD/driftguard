"use client";

import { locales, type Locale } from "@/i18n/config";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { UserPreferences } from "@/lib/preferences/config";

const localeLabels: Record<Locale, string> = {
  en: "English",
  zh: "中文",
  hi: "हिन्दी",
  es: "Español",
  ar: "العربية",
  "pt-BR": "Português (BR)",
};

type LocaleSwitcherProps = {
  initialPreferences?: UserPreferences;
  className?: string;
  id?: string;
};

export function LocaleSwitcher({
  initialPreferences,
  className = "",
  id = "locale-switcher",
}: LocaleSwitcherProps) {
  const { preferences, loading, saving, setLocale } = useUserPreferences(initialPreferences);
  const value = preferences?.locale ?? "en";

  return (
    <select
      id={id}
      aria-label="Language"
      disabled={loading || saving}
      value={value}
      onChange={(e) => void setLocale(e.target.value as Locale)}
      className={`rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50 ${className}`}
    >
      {locales.map((locale) => (
        <option key={locale} value={locale}>
          {localeLabels[locale]}
        </option>
      ))}
    </select>
  );
}
