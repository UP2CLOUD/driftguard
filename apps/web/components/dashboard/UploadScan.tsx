"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const API = () => process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function UploadScan({ installationId }: { installationId: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,   setFile]   = useState<File|null>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error">("idle");
  const [result, setResult] = useState<any>(null);
  const [err,    setErr]    = useState("");
  const router = useRouter();

  async function upload() {
    if (!file) return;
    setStatus("loading");
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("installation_id", installationId);
    try {
      const res = await fetch(`${API()}/api/v1/scans/upload`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      setStatus("done");
      // Redirect to analysis page
      if (data.analysis_id) {
        setTimeout(() => router.push(`/dashboard/${installationId}/analyses/${data.analysis_id}`), 800);
      }
    } catch (e: any) {
      setStatus("error");
      setErr(e.message ?? "Unknown error");
    }
  }

  return (
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className={`flex items-center justify-center rounded border-2 border-dashed cursor-pointer py-6 transition
          ${file
            ? "border-[color:var(--dg-electric)]/50 bg-[color:var(--dg-electric)]/5"
            : "border-[color:var(--dg-border)] hover:border-[color:var(--dg-electric)]/40"}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".tar.gz,.tgz"
          className="hidden"
          onChange={e => { setFile(e.target.files?.[0] ?? null); setStatus("idle"); setResult(null); }}
        />
        <p className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] text-center">
          {file
            ? <><span className="text-[color:var(--dg-electric-bright)]">{file.name}</span><br/>{(file.size/1024).toFixed(0)} KB</>
            : <>Click to select <span className="text-[color:var(--dg-electric-bright)]">.tar.gz</span></>}
        </p>
      </div>

      {file && (
        <button
          onClick={upload}
          disabled={status === "loading"}
          className="w-full rounded bg-[color:var(--dg-electric)] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 transition"
        >
          {status === "loading" ? "Scanning…" : "Upload & scan →"}
        </button>
      )}

      {status === "done" && result && (
        <div className="rounded border border-allowed/20 bg-allowed/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-allowed">
            ✓ Score {result.risk_score}/100 · {result.findings?.length ?? 0} findings
          </p>
          <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
            Redirecting to results…
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="font-mono text-[11px] text-blocked">✗ {err}</p>
      )}
    </div>
  );
}
