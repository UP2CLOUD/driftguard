"use client";

import { currencies, currencyLabels, type CurrencyCode } from "@/lib/currency/config";
import { locales, type Locale } from "@/i18n/config";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { UserPreferences } from "@/lib/preferences/config";
import { useT } from "@/components/I18nProvider";

const localeLabels: Record<Locale, string> = {
  en: "English",
  zh: "中文 (简体)",
  hi: "हिन्दी",
  es: "Español",
  ar: "العربية",
  "pt-BR": "Português (Brasil)",
};

type UserPreferencesSettingsProps = {
  initialPreferences: UserPreferences;
};

export function UserPreferencesSettings({ initialPreferences }: UserPreferencesSettingsProps) {
  const t = useT();
  const { preferences, saving, error, setLocale, setCurrency } =
    useUserPreferences(initialPreferences);

  const locale = preferences?.locale ?? initialPreferences.locale;
  const currency = preferences?.currency ?? initialPreferences.currency;

  return (
    <section className="mt-8 border-t border-zinc-800 pt-6">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
        {t("settings.preferencesTitle")}
      </h2>
      <p className="mt-2 text-sm text-zinc-400">{t("settings.preferencesSubtitle")}</p>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            {t("settings.language")}
          </span>
          <select
            value={locale}
            disabled={saving}
            onChange={(e) => void setLocale(e.target.value as Locale)}
            className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50"
          >
            {locales.map((loc) => (
              <option key={loc} value={loc}>
                {localeLabels[loc]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-zinc-500">{t("settings.languageHint")}</p>
        </label>

        <label className="block">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">
            {t("settings.currency")}
          </span>
          <select
            value={currency}
            disabled={saving}
            onChange={(e) => void setCurrency(e.target.value as CurrencyCode)}
            className="mt-2 w-full rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 disabled:opacity-50"
          >
            {currencies.map((code) => (
              <option key={code} value={code}>
                {currencyLabels[code]}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-zinc-500">{t("settings.currencyHint")}</p>
        </label>
      </div>

      {saving && (
        <p className="mt-3 text-xs text-zinc-500">{t("settings.saving")}</p>
      )}
      {error && (
        <p className="mt-3 text-xs text-red-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
