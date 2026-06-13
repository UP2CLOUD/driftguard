"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RescanButton({
  installationId,
  repoFullName,
  headSha,
}: {
  installationId: string;
  repoFullName: string;
  headSha?: string | null;
}) {
  const [status, setStatus] = useState<"idle" | "scanning" | "polling" | "done" | "error">("idle");
  const router = useRouter();

  async function rescan() {
    if (status === "scanning" || status === "polling") return;
    setStatus("scanning");
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installation_id: parseInt(installationId, 10),
          repo_full_name: repoFullName,
          ref: headSha ?? undefined,
        }),
      });
      const data = await res.json();
      if (res.ok && data.analysis_id) {
        setStatus("done");
        router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`);
      } else if (res.ok && data.task_id) {
        setStatus("polling");
        pollUntilDone(data.task_id);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  async function pollUntilDone(taskId: string) {
    for (let i = 0; i < 36; i++) {
      await new Promise((r) => setTimeout(r, 5000));
      try {
        const res = await fetch(`/api/scan/tasks/${taskId}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.state === "completed" && data.analysis_id) {
          setStatus("done");
          router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`);
          return;
        }
        if (data.state === "failed") {
          setStatus("error");
          setTimeout(() => setStatus("idle"), 3000);
          return;
        }
      } catch {
        // keep polling
      }
    }
    setStatus("done");
    router.push(`/dashboard/${installationId}/analyses`);
  }

  if (status === "scanning") {
    return (
      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] animate-pulse">
        queuing…
      </span>
    );
  }
  if (status === "polling") {
    return (
      <span className="font-mono text-[10px] text-[color:var(--dg-electric-bright)] flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--dg-electric-bright)] animate-pulse" />
        scanning…
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="font-mono text-[10px] text-blocked">
        failed — try again
      </span>
    );
  }

  return (
    <button
      onClick={rescan}
      className="inline-flex items-center gap-1.5 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] px-3 py-1.5 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/50 transition"
    >
      ↺ Re-run scan
    </button>
  );
}
