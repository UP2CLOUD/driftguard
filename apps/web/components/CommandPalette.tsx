"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { signOutToHome } from "@/lib/auth-actions";

interface Command {
  label: string;
  description?: string;
  action: () => void;
}

interface CommandPaletteProps {
  installationId: string;
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ installationId, open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const base = `/dashboard/${installationId}`;
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const commands: Command[] = [
    { label: "Overview", description: "Go to dashboard overview", action: () => router.push(base) },
    { label: "Repos", description: "Manage connected repositories", action: () => router.push(`${base}/repos`) },
    { label: "Incidents", description: "View active incidents", action: () => router.push(`${base}/incidents`) },
    { label: "Policies", description: "Configure policy rules", action: () => router.push(`${base}/policies`) },
    { label: "Memory", description: "Review AI memory decisions", action: () => router.push(`${base}/memory`) },
    { label: "Settings", description: "Workspace and billing settings", action: () => router.push(`${base}/settings`) },
    {
      label: "Connect GitHub",
      description: "Install GitHub App on your organization",
      action: () => {
        const slug = process.env.NEXT_PUBLIC_GITHUB_APP_SLUG || "driftguard-reviews";
        window.open(`https://github.com/apps/${slug}/installations/new`, "_blank");
      },
    },
    { label: "Docs", description: "Read the documentation", action: () => router.push("/docs") },
    { label: "Sign out", description: "Sign out of DriftGuard", action: () => signOutToHome() },
  ];

  const filtered = commands.filter(
    (c) =>
      !query ||
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      c.description?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { setSelected((s) => Math.min(s + 1, filtered.length - 1)); e.preventDefault(); return; }
      if (e.key === "ArrowUp") { setSelected((s) => Math.max(s - 1, 0)); e.preventDefault(); return; }
      if (e.key === "Enter") {
        filtered[selected]?.action();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, selected, filtered, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
      onClick={onClose}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-[color:var(--dg-canvas)]/80 backdrop-blur-sm" />

      {/* panel */}
      <div
        className="relative w-full max-w-lg rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* search */}
        <div className="flex items-center gap-3 border-b border-[color:var(--dg-border)] px-4 py-3">
          <svg className="h-3.5 w-3.5 text-[color:var(--dg-fg-subtle)] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search commands…"
            className="flex-1 bg-transparent font-mono text-[13px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] outline-none"
          />
          <kbd className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5">esc</kbd>
        </div>

        {/* results */}
        <div className="max-h-64 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <div className="px-4 py-6 text-center font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
              No commands found
            </div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.label}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition ${
                  i === selected
                    ? "bg-[color:var(--dg-surface-raised)]"
                    : "hover:bg-[color:var(--dg-surface-raised)]"
                }`}
                onClick={() => { cmd.action(); onClose(); }}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-[12px] text-[color:var(--dg-fg)]">{cmd.label}</div>
                  {cmd.description && (
                    <div className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] truncate">{cmd.description}</div>
                  )}
                </div>
                {i === selected && (
                  <kbd className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] border border-[color:var(--dg-border)] rounded px-1.5 py-0.5 shrink-0">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
