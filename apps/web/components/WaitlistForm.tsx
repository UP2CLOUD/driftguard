"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

export function WaitlistForm({ theme = "light" }: { theme?: "light" | "dark" }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage(null);
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.ok) {
        setStatus("ok");
        return;
      }
      setStatus("err");
      setErrorMessage(
        r.status === 429
          ? t("waitlist.errorTooMany")
          : r.status === 503
            ? t("waitlist.errorUnavailable")
            : t("waitlist.errorGeneric")
      );
    } catch {
      setStatus("err");
      setErrorMessage(t("waitlist.errorNetwork"));
    }
  }

  const dark = theme === "dark";

  return (
    <div className="w-full max-w-md">
      <form onSubmit={submit} className="flex w-full gap-2">
        <input
          type="email"
          required
          placeholder={t("waitlist.placeholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={status === "err"}
          aria-describedby={status === "err" ? "waitlist-error" : undefined}
          className={`flex-1 rounded px-4 py-2.5 text-sm outline-none border transition focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
            dark
              ? "bg-[color:var(--dg-surface)] text-[color:var(--dg-fg)] border-[color:var(--dg-border)] placeholder:text-[color:var(--dg-fg-subtle)]"
              : "bg-[color:var(--dg-fg)] text-[color:var(--dg-canvas)] border-[color:var(--dg-border)] placeholder:text-[color:var(--dg-fg-muted)]"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="rounded bg-[color:var(--dg-electric-bright)] px-6 py-2.5 text-sm font-semibold text-[color:var(--dg-canvas)] transition duration-150 ease-out hover:bg-[color:var(--dg-electric)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dg-electric)]/30 active:scale-[0.98] active:opacity-90 disabled:opacity-60"
        >
          {status === "loading" ? t("waitlist.loading") : status === "ok" ? t("waitlist.success") : t("waitlist.join")}
        </button>
      </form>
      {status === "err" && errorMessage && (
        <p id="waitlist-error" className="mt-1.5 text-[11px] text-[color:var(--dg-blocked)]">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
