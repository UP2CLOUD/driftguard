"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Labels = {
  placeholder?: string;
  branchPlaceholder?: string;
  runBtn?: string;
  queuing?: string;
  scanning?: string;
  complete?: string;
  failedWorker?: string;
  queuedWaiting?: string;
  quotaExceeded?: string;
  managePlan?: string;
};

async function pollTask(
  taskId: string,
  installationId: string,
  onStatus: (msg: string) => void,
  router: ReturnType<typeof useRouter>,
  labels: Labels,
): Promise<void> {
  for (let attempt = 0; attempt < 36; attempt++) {
    await new Promise((r) => setTimeout(r, 5000));
    try {
      const res = await fetch(`/api/scan/tasks/${taskId}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.state === "completed" && data.analysis_id) {
        onStatus(labels.complete ?? "Scan complete — redirecting…");
        router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`);
        return;
      }
      if (data.state === "failed") {
        onStatus(labels.failedWorker ?? "Scan failed on worker");
        return;
      }
      if (data.state === "started") {
        onStatus(labels.scanning ?? "Scanning…");
      }
    } catch {
      // transient network error — keep polling
    }
  }
  // 3 minutes elapsed — send to analyses list
  router.push(`/dashboard/${installationId}/analyses`);
}

export function ScanTrigger({
  installationId,
  labels,
}: {
  installationId: string;
  labels?: Labels;
}) {
  const [repo, setRepo] = useState("");
  const [ref, setRef] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "polling" | "done" | "error" | "quota">("idle");
  const [msg, setMsg] = useState("");
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
          ref: ref.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setStatus("quota");
        setMsg(data.detail || (labels?.quotaExceeded ?? "Monthly scan limit reached."));
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Scan failed");

      if (data.analysis_id) {
        setStatus("done");
        setMsg(labels?.complete ?? "Scan complete — redirecting…");
        setTimeout(() => router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`), 800);
      } else if (data.task_id) {
        setStatus("polling");
        setMsg(labels?.queuedWaiting ?? "Scan queued — waiting for worker…");
        pollTask(data.task_id, installationId, setMsg, router, labels ?? {}).then(() => {
          setStatus("done");
        });
      } else {
        setStatus("done");
        setMsg(labels?.complete ?? "Scan complete");
        setTimeout(() => router.refresh(), 2500);
      }
    } catch (e: any) {
      setStatus("error");
      setMsg(e.message ?? "Unknown error");
    }
  }

  const busy = status === "loading" || status === "polling";

  return (
    <div className="space-y-3">
      <input
        value={repo}
        onChange={(e) => setRepo(e.target.value)}
        placeholder={labels?.placeholder ?? "owner/repository"}
        disabled={busy}
        className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition disabled:opacity-50"
      />
      <div className="flex gap-2">
        <input
          value={ref}
          onChange={(e) => setRef(e.target.value)}
          placeholder={labels?.branchPlaceholder ?? "default branch"}
          disabled={busy}
          className="w-28 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition disabled:opacity-50"
        />
        <button
          onClick={trigger}
          disabled={busy || !repo.trim()}
          className="flex-1 rounded bg-[color:var(--dg-electric)] px-4 py-2 font-sans font-semibold text-[11px] uppercase tracking-wide text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {status === "loading"
            ? (labels?.queuing ?? "Queuing…")
            : status === "polling"
              ? (labels?.scanning ?? "Scanning…")
              : (labels?.runBtn ?? "Run scan →")}
        </button>
      </div>
      {msg && status !== "quota" && (
        <p className={`font-mono text-[11px] flex items-center gap-1.5 ${status === "error" ? "text-blocked" : status === "polling" ? "text-[color:var(--dg-electric-bright)]" : "text-allowed"}`}>
          {status === "polling" && (
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--dg-electric-bright)] animate-pulse" />
          )}
          {msg}
        </p>
      )}
      {status === "quota" && (
        <div className="rounded border border-blocked/20 bg-blocked/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-blocked">✗ {msg}</p>
          <a
            href={`/dashboard/${installationId}/settings`}
            className="font-sans font-medium text-[10px] text-[color:var(--dg-electric-bright)] underline underline-offset-2"
          >
            {labels?.managePlan ?? "Manage plan →"}
          </a>
        </div>
      )}
    </div>
  );
}
