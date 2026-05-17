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

  const dark = theme === "dark";

  return (
    <form onSubmit={submit} className="flex w-full max-w-md gap-2">
      <input
        type="email"
        required
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={`flex-1 rounded-full px-5 py-3 text-sm outline-none ring-1 transition focus:ring-2 ${
          dark
            ? "bg-white/10 text-paper ring-white/20 placeholder:text-paper/50 focus:ring-accent"
            : "bg-white text-ink ring-ink/15 focus:ring-accent"
        }`}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-paper transition hover:bg-ink disabled:opacity-60"
      >
        {status === "loading" ? "..." : status === "ok" ? "✓ In" : "Join"}
      </button>
    </form>
  );
}
