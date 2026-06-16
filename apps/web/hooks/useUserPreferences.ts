"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurrencyCode } from "@/lib/currency/config";
import type { Locale } from "@/i18n/config";
import type { Theme, UserPreferences } from "@/lib/preferences/config";

type PreferencesPatch = Partial<UserPreferences>;

export function useUserPreferences(initial?: UserPreferences) {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(
    initial ?? null
  );
  const [loading, setLoading] = useState(!initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initial) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/preferences", { cache: "no-store" });
        if (!res.ok) throw new Error("failed to load preferences");
        const data = (await res.json()) as UserPreferences;
        if (!cancelled) setPreferences(data);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [initial]);

  const updatePreferences = useCallback(
    async (patch: PreferencesPatch) => {
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/preferences", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "failed to save preferences");
        }
        const data = (await res.json()) as UserPreferences;
        setPreferences(data);
        // Full reload ensures server re-renders with new cookie AND
        // clears message module cache for correct locale translation
        if (typeof window !== "undefined") {
          window.location.reload();
        } else {
          router.refresh();
        }
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [router]
  );

  const setLocale = useCallback(
    (locale: Locale) => updatePreferences({ locale }),
    [updatePreferences]
  );

  const setCurrency = useCallback(
    (currency: CurrencyCode) => updatePreferences({ currency }),
    [updatePreferences]
  );

  const setTheme = useCallback(
    (theme: Theme) => updatePreferences({ theme }),
    [updatePreferences]
  );

  return {
    preferences,
    loading,
    saving,
    error,
    setLocale,
    setCurrency,
    setTheme,
    updatePreferences,
  };
}
