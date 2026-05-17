"use client";

import { useState } from "react";

export function WaitlistForm({ theme = "light" }: { theme?: "light" | "dark" }) {
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

  // We are forcing dark mode in the new layout, but we keep the logic just in case
  const dark = theme === "dark";

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        required
        placeholder="you@company.com"
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
        className="rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600 disabled:opacity-60"
      >
        {status === "loading" ? "..." : status === "ok" ? "✓ In" : "Join"}
      </button>
    </form>
  );
}
