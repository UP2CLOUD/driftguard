"use client";

import { locales, type Locale } from "@/i18n/config";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import type { UserPreferences } from "@/lib/preferences/config";
import { useState, useRef, useEffect } from "react";

const LOCALE_FLAGS: Record<Locale, string> = {
  en: "🇬🇧",
  "pt-BR": "🇧🇷",
  es: "🇪🇸",
  zh: "🇨🇳",
  hi: "🇮🇳",
  ar: "🇸🇦",
};

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
  label?: string;
};

export function LocaleSwitcher({
  initialPreferences,
  className = "",
  compact = false,
  label = "Language",
}: Props) {
  const { preferences, loading, saving, setLocale } = useUserPreferences(initialPreferences);
  const value = (preferences?.locale ?? "en") as Locale;
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeMenu();
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  function openMenu() {
    setOpen(true);
    // Small rAF so the element is mounted before the CSS transition kicks in
    requestAnimationFrame(() => setVisible(true));
  }

  function closeMenu() {
    setVisible(false);
    setTimeout(() => setOpen(false), 150);
  }

  function handleSelect(locale: Locale) {
    void setLocale(locale);
    closeMenu();
  }

  const disabled = loading || saving;

  return (
    <div ref={ref} className={`relative inline-flex items-center ${className}`}>
      {/* Trigger button */}
      <button
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => (open ? closeMenu() : openMenu())}
        className={`
          inline-flex items-center gap-1.5 px-2 py-1 rounded
          font-mono text-[10px] uppercase tracking-widest
          text-[color:var(--dg-fg-subtle)] border border-transparent
          transition-all duration-150
          hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-border)] hover:bg-[color:var(--dg-surface)]
          focus:outline-none focus:border-[color:var(--dg-border-strong)]
          disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer
          ${open ? "border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)]" : ""}
        `}
      >
        <span className="text-[13px] leading-none" aria-hidden="true">
          {LOCALE_FLAGS[value]}
        </span>
        <span>{compact ? LOCALE_CODE[value] : LOCALE_LABELS[value]}</span>
        {/* Chevron */}
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className={`h-2 w-2 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M3 4.5 L6 7.5 L9 4.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          aria-label={label}
          className={`
            absolute z-50 right-0 top-full mt-1.5
            min-w-[140px] rounded-lg
            border border-[color:var(--dg-border)]
            bg-[color:var(--dg-canvas)]/95 backdrop-blur-md
            shadow-lg shadow-black/20
            overflow-hidden
            transition-all duration-150 origin-top-right
            ${visible ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-1"}
          `}
          style={{ transition: "opacity 150ms ease-out, transform 150ms ease-out" }}
        >
          {locales.map((locale) => {
            const active = locale === value;
            return (
              <button
                key={locale}
                role="option"
                aria-selected={active}
                onClick={() => handleSelect(locale)}
                className={`
                  w-full flex items-center gap-2.5 px-3 py-2 text-left
                  font-sans text-[12px] tracking-normal normal-case
                  transition-colors duration-100 cursor-pointer
                  ${
                    active
                      ? "text-[color:var(--dg-fg)] bg-[color:var(--dg-surface)]"
                      : "text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:bg-[color:var(--dg-surface)]"
                  }
                `}
              >
                <span className="text-[14px] leading-none w-5 text-center" aria-hidden="true">
                  {LOCALE_FLAGS[locale]}
                </span>
                <span className="flex-1">{LOCALE_LABELS[locale]}</span>
                {active && (
                  <svg
                    className="h-3 w-3 text-[color:var(--dg-electric)] flex-shrink-0"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M2 6 L5 9 L10 3" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
