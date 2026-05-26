"use client";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { UserPreferences } from "@/lib/preferences/config";

export function NavPreferencesControls({
  initialPreferences,
  languageLabel = "Language",
}: {
  initialPreferences: UserPreferences;
  languageLabel?: string;
}) {
  return (
    <LocaleSwitcher
      label={languageLabel}
      initialPreferences={initialPreferences}
      className="max-w-[9rem]"
    />
  );
}
