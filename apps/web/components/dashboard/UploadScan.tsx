"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Labels = {
  uploadScanBtn?: string;
  scanning?: string;
  clickToSelect?: string;
  redirecting?: string;
  uploadResult?: string;
  quotaExceeded?: string;
  managePlan?: string;
};

export function UploadScan({
  installationId,
  labels,
}: {
  installationId: string;
  labels?: Labels;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file,   setFile]   = useState<File|null>(null);
  const [status, setStatus] = useState<"idle"|"loading"|"done"|"error"|"quota">("idle");
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
      const res = await fetch("/api/scan/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (res.status === 402) {
        setStatus("quota");
        setErr(data.detail || (labels?.quotaExceeded ?? "Monthly scan limit reached."));
        return;
      }
      if (!res.ok) throw new Error(data.detail || "Upload failed");
      setResult(data);
      setStatus("done");
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
            : <>{labels?.clickToSelect ?? "Click to select"} <span className="text-[color:var(--dg-electric-bright)]">.tar.gz</span></>}
        </p>
      </div>

      {file && (
        <button
          onClick={upload}
          disabled={status === "loading"}
          className="w-full rounded bg-[color:var(--dg-electric)] px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 transition"
        >
          {status === "loading"
            ? (labels?.scanning ?? "Scanning…")
            : (labels?.uploadScanBtn ?? "Upload & scan →")}
        </button>
      )}

      {status === "done" && result && (
        <div className="rounded border border-allowed/20 bg-allowed/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-allowed">
            ✓ {(labels?.uploadResult ?? "Score {score}/100 · {n} findings")
                .replace("{score}", String(result.risk_score ?? 0))
                .replace("{n}", String(result.findings?.length ?? 0))}
          </p>
          <p className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)] mt-0.5">
            {labels?.redirecting ?? "Redirecting to results…"}
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="font-mono text-[11px] text-blocked">✗ {err}</p>
      )}

      {status === "quota" && (
        <div className="rounded border border-blocked/20 bg-blocked/5 px-3 py-2.5">
          <p className="font-mono text-[11px] text-blocked">✗ {err}</p>
          <a
            href={`/dashboard/${installationId}/settings`}
            className="font-mono text-[10px] text-[color:var(--dg-electric-bright)] underline underline-offset-2"
          >
            {labels?.managePlan ?? "Manage plan →"}
          </a>
        </div>
      )}
    </div>
  );
}
