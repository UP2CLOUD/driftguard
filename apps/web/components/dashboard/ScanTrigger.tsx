"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ScanTrigger({ installationId }: { installationId: string }) {
  const [repo, setRepo] = useState("");
  const [ref, setRef]   = useState("");
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error"|"quota">("idle");
  const [msg, setMsg]   = useState("");
  const router = useRouter();

  async function trigger() {
    if (!repo.trim()) return;
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installation_id: parseInt(installationId, 10),
          repo_full_name: repo.trim(),
          // Empty = backend resolves the repository's default branch
          ref: ref.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setStatus("quota");
        setMsg(data.detail || "Monthly scan limit reached.");
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Scan failed");
      setStatus("done");
      if (data.analysis_id) {
        // In-process scan completed — navigate directly to the analysis page
        setMsg(`Scan complete — redirecting…`);
        setTimeout(() => router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`), 800);
      } else {
        // Celery queued — just refresh the list
        setMsg(`Scan queued — task ${data.task_id?.slice(0,8) ?? "started"}`);
        setTimeout(() => router.refresh(), 2500);
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e.message ?? "Unknown error");
    }
  }

  return (
    <div className="space-y-3">
      <input
        value={repo}
        onChange={e => setRepo(e.target.value)}
        placeholder="owner/repository"
        className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
      />
      <div className="flex gap-2">
        <input
          value={ref}
          onChange={e => setRef(e.target.value)}
          placeholder="default branch"
          className="w-28 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
        />
        <button
          onClick={trigger}
          disabled={status === "loading" || !repo.trim()}
          className="flex-1 rounded bg-[color:var(--dg-electric)] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {status === "loading" ? "Scanning…" : "Run scan →"}
        </button>
      </div>
      {msg && status !== "quota" && (
        <p className={`font-mono text-[11px] ${status === "error" ? "text-blocked" : "text-allowed"}`}>
          {status === "done" ? "✓" : "✗"} {msg}
        </p>
      )}
      {status === "quota" && (
        <div className="rounded border border-blocked/20 bg-blocked/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-blocked">✗ {msg}</p>
          <a
            href={`/dashboard/${installationId}/settings`}
            className="font-mono text-[10px] text-[color:var(--dg-electric-bright)] underline underline-offset-2"
          >
            Manage plan →
          </a>
        </div>
      )}
    </div>
  );
}
