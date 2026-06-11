"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RepoToggle({ repoId, enabled }: { repoId: string; enabled: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(enabled);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/repos/${repoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !localEnabled }),
      });
      if (res.ok) {
        setLocalEnabled(!localEnabled);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={localEnabled ? "Disable scanning" : "Enable scanning"}
      className={`h-4 w-7 rounded-full transition-colors duration-200 relative disabled:opacity-50 ${
        localEnabled ? "bg-allowed" : "bg-[color:var(--dg-border)]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform duration-200 ${
          localEnabled ? "translate-x-3.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
