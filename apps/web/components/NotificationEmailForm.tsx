"use client";

import { useState } from "react";

export function NotificationEmailForm({
  orgId,
  installationId,
  initialEmail,
}: {
  orgId: string;
  installationId: string;
  initialEmail: string | null | undefined;
}) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [testStatus, setTestStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    try {
      const res = await fetch(`/api/orgs/${orgId}/notifications`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_email: email.trim() || null }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail ?? `HTTP ${res.status}`);
      }
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to save");
      setStatus("error");
      setTimeout(() => setStatus("idle"), 4000);
    }
  }

  async function sendTest() {
    setTestStatus("sending");
    try {
      const res = await fetch(`/api/orgs/${orgId}/notifications/test`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail ?? `HTTP ${res.status}`);
      }
      setTestStatus("sent");
      setTimeout(() => setTestStatus("idle"), 3000);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to send test");
      setTestStatus("error");
      setTimeout(() => setTestStatus("idle"), 4000);
    }
  }

  const savedEmail = initialEmail;

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="team@yourcompany.com"
          className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder:text-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
        />
        <button
          type="submit"
          disabled={status === "saving"}
          className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)] disabled:opacity-50 transition"
        >
          {status === "saving" ? "saving…" : "Save"}
        </button>
      </div>
      {status === "saved" && (
        <p className="font-mono text-[10px] text-allowed">Saved.</p>
      )}
      {status === "error" && (
        <p className="font-mono text-[10px] text-blocked">{errorMsg}</p>
      )}
      <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] leading-relaxed">
        DriftGuard sends an alert when a PR scan scores ≥ 60 risk or a policy block rule fires. Leave blank to disable.
      </p>
      {savedEmail && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={sendTest}
            disabled={testStatus === "sending"}
            className="rounded border border-[color:var(--dg-border)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)] disabled:opacity-50 transition"
          >
            {testStatus === "sending" ? "sending…" : "Send test email"}
          </button>
          {testStatus === "sent" && (
            <span className="font-mono text-[10px] text-allowed">Test sent to {savedEmail}</span>
          )}
          {testStatus === "error" && (
            <span className="font-mono text-[10px] text-blocked">{errorMsg}</span>
          )}
        </div>
      )}
    </form>
  );
}
