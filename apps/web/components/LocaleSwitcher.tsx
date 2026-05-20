"use client";

import { locales, type Locale } from "@/i18n/config";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { UserPreferences } from "@/lib/preferences/config";

const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  "pt-BR": "Português",
  es: "Español",
  zh: "中文",
  hi: "हिन्दी",
  ar: "العربية",
};

const LOCALE_CODE: Record<Locale, string> = {
  en: "EN",
  "pt-BR": "PT",
  es: "ES",
  zh: "ZH",
  hi: "HI",
  ar: "AR",
};

type Props = {
  initialPreferences?: UserPreferences;
  className?: string;
  compact?: boolean;
};

export function LocaleSwitcher({ initialPreferences, className = "", compact = false }: Props) {
  const { preferences, loading, saving, setLocale } = useUserPreferences(initialPreferences);
  const value = preferences?.locale ?? "en";

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      {/* Globe icon */}
      <svg
        className="absolute left-2 h-3 w-3 text-[color:var(--dg-fg-subtle)] pointer-events-none"
        viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4"
      >
        <circle cx="8" cy="8" r="6.5" />
        <path d="M1.5 8h13M8 1.5a10 10 0 010 13M8 1.5a10 10 0 000 13" />
      </svg>
      <select
        aria-label="Language"
        disabled={loading || saving}
        value={value}
        onChange={(e) => void setLocale(e.target.value as Locale)}
        className={`appearance-none bg-transparent pl-7 pr-6 py-1 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] border border-transparent hover:border-[color:var(--dg-border)] rounded transition disabled:opacity-40 cursor-pointer focus:outline-none focus:border-[color:var(--dg-border-strong)]`}
      >
        {locales.map((l) => (
          <option key={l} value={l} className="bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)] normal-case tracking-normal">
            {compact ? LOCALE_CODE[l] : LOCALE_LABELS[l]}
          </option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        className="absolute right-1.5 h-2.5 w-2.5 text-[color:var(--dg-fg-subtle)] pointer-events-none"
        viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
      >
        <path d="M3 4.5 L6 7.5 L9 4.5" />
      </svg>
    </div>
  );
}
