"use client";

import { currencies, currencyLabels, type CurrencyCode } from "@/lib/currency/config";
import { locales, type Locale } from "@/i18n/config";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { Theme, UserPreferences } from "@/lib/preferences/config";
import { useT } from "@/components/I18nProvider";

const localeLabels: Record<Locale, string> = {
  en: "English",
  zh: "中文 (简体)",
  hi: "हिन्दी",
  es: "Español",
  ar: "العربية",
  "pt-BR": "Português (Brasil)",
};

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4"/>
      <line x1="12" y1="2" x2="12" y2="4"/>
      <line x1="12" y1="20" x2="12" y2="22"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="2" y1="12" x2="4" y2="12"/>
      <line x1="20" y1="12" x2="22" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <line x1="8" y1="21" x2="16" y2="21"/>
      <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
  );
}

type UserPreferencesSettingsProps = {
  initialPreferences: UserPreferences;
};

const themeOptions: { value: Theme; icon: React.ReactNode; labelKey: string }[] = [
  { value: "light", icon: <SunIcon />, labelKey: "settings.themeLight" },
  { value: "dark",  icon: <MoonIcon />, labelKey: "settings.themeDark" },
  { value: "system", icon: <SystemIcon />, labelKey: "settings.themeSystem" },
];

export function UserPreferencesSettings({ initialPreferences }: UserPreferencesSettingsProps) {
  const t = useT();
  const { preferences, saving, error, setLocale, setCurrency, setTheme } =
    useUserPreferences(initialPreferences);

  const locale = preferences?.locale ?? initialPreferences.locale;
  const currency = preferences?.currency ?? initialPreferences.currency;
  const theme = preferences?.theme ?? initialPreferences.theme;

  return (
    <section className="mt-8 border-t border-[color:var(--dg-border)] pt-6">
      <h2 className="text-lg font-semibold tracking-tight text-[color:var(--dg-fg)]">
        {t("settings.preferencesTitle")}
      </h2>
      <p className="mt-2 text-sm text-[color:var(--dg-fg-muted)]">{t("settings.preferencesSubtitle")}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--dg-fg-muted)]">
            {t("settings.language")}
          </span>
          <select
            value={locale}
            disabled={saving}
            onChange={(e) => void setLocale(e.target.value as Locale)}
            className="mt-2 w-full rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2 text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] focus:ring-1 focus:ring-[color:var(--dg-electric)]/20 disabled:opacity-50"
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {localeLabels[loc]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[color:var(--dg-fg-subtle)]">{t("settings.languageHint")}</p>
        </label>

        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--dg-fg-muted)]">
            {t("settings.currency")}
          </span>
          <select
            value={currency}
            disabled={saving}
            onChange={(e) => void setCurrency(e.target.value as CurrencyCode)}
            className="mt-2 w-full rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2 text-sm text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)] focus:ring-1 focus:ring-[color:var(--dg-electric)]/20 disabled:opacity-50"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {currencyLabels[code]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-[color:var(--dg-fg-subtle)]">{t("settings.currencyHint")}</p>
        </label>
      </div>

      <div className="mt-6">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--dg-fg-muted)]">
          {t("settings.theme") ?? "Theme"}
        </span>
        <div className="mt-2 flex gap-2" role="radiogroup" aria-label={t("settings.theme") ?? "Theme"}>
          {themeOptions.map(({ value, icon, labelKey }) => {
            const isActive = theme === value;
            return (
              <button
                key={value}
                role="radio"
                aria-checked={isActive}
                disabled={saving}
                onClick={() => void setTheme(value)}
                className={`flex items-center gap-1.5 rounded border px-3 py-2 text-[11px] font-medium transition cursor-pointer disabled:opacity-50 ${
                  isActive
                    ? "border-[color:var(--dg-electric)] bg-[color:var(--dg-electric-dim)] text-[color:var(--dg-electric-bright)]"
                    : "border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] text-[color:var(--dg-fg-muted)] hover:border-[color:var(--dg-border-bright)] hover:text-[color:var(--dg-fg)]"
                }`}
              >
                {icon}
                {t(labelKey) ?? value}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-xs text-[color:var(--dg-fg-subtle)]">{t("settings.themeHint") ?? "Choose how DriftGuard looks. System follows your OS setting."}</p>
      </div>

      {saving && (
        <p className="mt-3 text-xs text-[color:var(--dg-fg-subtle)]">{t("settings.saving")}</p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
