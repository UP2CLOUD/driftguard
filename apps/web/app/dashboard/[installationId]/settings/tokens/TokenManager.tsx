"use client";

import { useState, useTransition } from "react";
import { createToken, revokeToken, type CreatedToken, type TokenItem } from "./actions";

type Labels = Record<
  | "name" | "namePlaceholder" | "role" | "create" | "creating" | "copyHint"
  | "copy" | "copied" | "empty" | "revoke" | "revoked" | "lastUsed" | "never"
  | "created" | "loadError" | "confirmRevoke" | "usageTitle",
  string
>;

const ROLES = ["org:viewer", "org:member", "org:admin"] as const;

export function TokenManager({
  installationId,
  initialTokens,
  labels: L,
}: {
  installationId: string;
  initialTokens: TokenItem[] | null;
  labels: Labels;
}) {
  const [tokens, setTokens] = useState<TokenItem[] | null>(initialTokens);
  const [name, setName] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]>("org:member");
  const [fresh, setFresh] = useState<CreatedToken | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = () => {
    setError(null);
    startTransition(async () => {
      const res = await createToken(installationId, name, role);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setFresh(res.token);
      setCopied(false);
      setName("");
      setTokens((prev) => [
        {
          id: res.token.id,
          name: res.token.name,
          role: res.token.role,
          scopes: null,
          revoked: false,
          last_used_at: null,
          expires_at: res.token.expires_at,
          created_at: new Date().toISOString(),
        },
        ...(prev ?? []),
      ]);
    });
  };

  const onRevoke = (id: string) => {
    if (!window.confirm(L.confirmRevoke)) return;
    startTransition(async () => {
      const res = await revokeToken(installationId, id);
      if (res.ok) {
        setTokens((prev) =>
          (prev ?? []).map((tk) => (tk.id === id ? { ...tk, revoked: true } : tk))
        );
        if (fresh?.id === id) setFresh(null);
      }
    });
  };

  const copyFresh = async () => {
    if (!fresh) return;
    await navigator.clipboard.writeText(fresh.token).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Create */}
      <div className="rounded-md border border-[color:var(--dg-border)] p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1">
            <span className="block font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">
              {L.name}
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={L.namePlaceholder}
              maxLength={128}
              className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[13px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)]"
            />
          </label>
          <label>
            <span className="block font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1">
              {L.role}
            </span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
              className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-2 font-mono text-[13px] text-[color:var(--dg-fg)] outline-none focus:border-[color:var(--dg-electric)]"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <button
              onClick={onCreate}
              disabled={pending || !name.trim()}
              className="dg-button dg-button-primary text-[13px] px-4 py-2 disabled:opacity-50"
            >
              {pending ? L.creating : L.create}
            </button>
          </div>
        </div>
        {error && (
          <p className="font-mono text-[11px] text-blocked">{error}</p>
        )}

        {fresh && (
          <div className="rounded border border-warned/30 bg-warned/5 p-3 space-y-2">
            <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-warned">
              {L.copyHint}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)]">
                {fresh.token}
              </code>
              <button
                onClick={copyFresh}
                className="dg-button dg-button-ghost text-[12px] px-3 py-2 shrink-0"
              >
                {copied ? L.copied : L.copy}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* List */}
      <div className="rounded-md border border-[color:var(--dg-border)] overflow-hidden">
        {tokens === null ? (
          <p className="px-4 py-6 text-[13px] text-warned">{L.loadError}</p>
        ) : tokens.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-[color:var(--dg-fg-muted)]">{L.empty}</p>
        ) : (
          <div className="divide-y divide-[color:var(--dg-border)]">
            {tokens.map((tk) => (
              <div key={tk.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`font-mono text-[13px] truncate ${tk.revoked ? "line-through text-[color:var(--dg-fg-subtle)]" : "text-[color:var(--dg-fg)]"}`}>
                      {tk.name}
                    </span>
                    <span className="font-sans font-medium text-[10px] rounded border border-[color:var(--dg-border)] px-1.5 py-0.5 text-[color:var(--dg-fg-subtle)]">
                      {tk.role}
                    </span>
                    {tk.revoked && (
                      <span className="font-sans font-medium text-[10px] rounded border border-blocked/30 bg-blocked/5 px-1.5 py-0.5 text-blocked">
                        {L.revoked}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
                    {L.created} {new Date(tk.created_at).toLocaleDateString()} · {L.lastUsed}{" "}
                    {tk.last_used_at ? new Date(tk.last_used_at).toLocaleString() : L.never}
                  </p>
                </div>
                {!tk.revoked && (
                  <button
                    onClick={() => onRevoke(tk.id)}
                    disabled={pending}
                    className="dg-button dg-button-ghost text-[11px] px-3 py-1.5 text-blocked border-blocked/30 hover:bg-blocked/10 disabled:opacity-50"
                  >
                    {L.revoke}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Usage */}
      <div className="rounded-md border border-[color:var(--dg-border)] p-4">
        <p className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-2">
          {L.usageTitle}
        </p>
        <pre className="overflow-x-auto rounded bg-[color:var(--dg-canvas)] p-3 font-mono text-[11px] leading-relaxed text-[color:var(--dg-fg-muted)]">
{`curl -H "Authorization: Bearer dg_live_..." \\
  ${process.env.NEXT_PUBLIC_API_URL || "https://api.driftguard.io"}/api/v1/dashboard/overview?installation_id=${installationId}`}
        </pre>
      </div>
    </div>
  );
}
