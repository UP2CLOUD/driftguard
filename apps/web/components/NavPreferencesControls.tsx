"use client";

import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import type { UserPreferences } from "@/lib/preferences/config";

export function NavPreferencesControls({
  initialPreferences,
}: {
  initialPreferences: UserPreferences;
}) {
  return (
    <LocaleSwitcher
      initialPreferences={initialPreferences}
      className="max-w-[9rem]"
    />
  );
}
