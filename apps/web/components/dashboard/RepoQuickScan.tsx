"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RepoQuickScan({
  installationId,
  repoFullName,
  labels,
}: {
  installationId: string;
  repoFullName: string;
  labels?: {
    scan?: string;
    queuing?: string;
    scanning?: string;
    done?: string;
    failed?: string;
  };
}) {
  const [status, setStatus] = useState<"idle" | "scanning" | "polling" | "done" | "error">("idle");
  const router = useRouter();

  async function scan() {
    if (status === "scanning" || status === "polling") return;
    setStatus("scanning");
    try {
      const res = await fetch("/api/scan/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installation_id: parseInt(installationId, 10),
          repo_full_name: repoFullName,
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
        setStatus(res.ok ? "done" : "error");
        if (res.ok) setTimeout(() => router.refresh(), 2000);
        else setTimeout(() => setStatus("idle"), 3000);
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
      <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)] animate-pulse">
        {labels?.queuing ?? "queuing…"}
      </span>
    );
  }
  if (status === "polling") {
    return (
      <span className="font-sans font-medium text-[10px] text-[color:var(--dg-electric-bright)] flex items-center gap-1">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--dg-electric-bright)] animate-pulse" />
        {labels?.scanning ?? "scanning…"}
      </span>
    );
  }
  if (status === "done") {
    return <span className="font-sans font-medium text-[10px] text-allowed">{labels?.done ?? "done ✓"}</span>;
  }
  if (status === "error") {
    return <span className="font-sans font-medium text-[10px] text-blocked">{labels?.failed ?? "failed ✗"}</span>;
  }

  return (
    <button
      onClick={scan}
      className="font-sans font-medium text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
    >
      {labels?.scan ?? "scan →"}
    </button>
  );
}
