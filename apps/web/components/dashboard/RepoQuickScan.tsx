"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RepoQuickScan({
  installationId,
  repoFullName,
}: {
  installationId: string;
  repoFullName: string;
}) {
  const [status, setStatus] = useState<"idle" | "scanning" | "done" | "error">("idle");
  const router = useRouter();

  async function scan() {
    if (status === "scanning") return;
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
      } else if (res.ok) {
        setStatus("done");
        setTimeout(() => router.refresh(), 2000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }

  if (status === "scanning") {
    return (
      <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] animate-pulse">
        scanning…
      </span>
    );
  }
  if (status === "done") {
    return <span className="font-mono text-[10px] text-allowed">queued ✓</span>;
  }
  if (status === "error") {
    return <span className="font-mono text-[10px] text-blocked">failed ✗</span>;
  }

  return (
    <button
      onClick={scan}
      className="font-mono text-[10px] text-[color:var(--dg-electric)] hover:text-[color:var(--dg-electric-bright)] transition"
    >
      scan →
    </button>
  );
}
