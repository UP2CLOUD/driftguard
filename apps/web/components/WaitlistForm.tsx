"use client";

import { useState } from "react";
import { useT } from "@/components/I18nProvider";

export function WaitlistForm({ theme = "light" }: { theme?: "light" | "dark" }) {
  const t = useT();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const r = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(r.ok ? "ok" : "err");
    } catch {
      setStatus("err");
    }
  }

  const dark = theme === "dark";

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        required
        placeholder={t("waitlist.placeholder")}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`flex-1 rounded px-4 py-2.5 text-sm outline-none border transition focus:ring-1 focus:ring-orange-500 focus:border-orange-500 ${
          dark
            ? "bg-zinc-900 text-zinc-100 border-zinc-800 placeholder:text-zinc-500"
            : "bg-white text-zinc-900 border-zinc-200 placeholder:text-zinc-400"
        }`}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition duration-150 ease-out hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? t("waitlist.loading") : status === "ok" ? t("waitlist.success") : t("waitlist.join")}
      </button>
    </form>
  );
}
