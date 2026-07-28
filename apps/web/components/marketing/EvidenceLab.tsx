"use client";

import { useEffect, useState } from "react";
import { useCallback } from "react";
import { Reveal } from "./Reveal";
import {
  BASE_RECORDS,
  buildChain,
  verifyChain,
  type EvidenceRecord,
  type VerifyResult,
} from "@/lib/demo/evidence";

const TAMPER_INDEX = 2; // the "policy: no-public-buckets matched" check_result record

function CopyableHash({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const short = `${value.slice(0, 14)}…${value.slice(-6)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — fail silently */
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="touch-manipulation break-all rounded font-mono text-[11px] text-[color:var(--dg-fg-muted)] underline decoration-dotted underline-offset-2 hover:text-[color:var(--dg-fg)]"
      >
        {expanded ? value : short}
      </button>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied to clipboard" : `Copy hash ${value}`}
        className="touch-manipulation min-h-[28px] rounded border border-[color:var(--dg-border-strong)] px-2 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </span>
  );
}

function statusBadge(status: "unverified" | "ok" | "broken" | undefined) {
  if (status === "ok") {
    return (
      <span className="rounded border border-[color:var(--dg-allowed)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-allowed)]">
        ✓ intact
      </span>
    );
  }
  if (status === "broken") {
    return (
      <span className="rounded border border-[color:var(--dg-blocked)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-blocked)]">
        ✗ broken
      </span>
    );
  }
  return (
    <span className="rounded border border-[color:var(--dg-border-strong)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
      not yet verified
    </span>
  );
}

export function EvidenceLab() {
  const [records, setRecords] = useState<EvidenceRecord[] | null>(null);
  const [tampered, setTampered] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    buildChain(BASE_RECORDS).then((chain) => {
      if (!cancelled) setRecords(chain);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runVerify = useCallback(async () => {
    if (!records) return;
    setVerifying(true);
    const r = await verifyChain(records);
    setResult(r);
    setVerifying(false);
  }, [records]);

  function tamperOneByte() {
    if (!records) return;
    const next = records.map((r) => ({ ...r }));
    const target = next[TAMPER_INDEX];
    // Flip a single character in the stored reason text — the record's
    // `hash` field is deliberately left untouched, exactly as if someone
    // edited a database row directly rather than going through the
    // chain-updating write path.
    next[TAMPER_INDEX] = {
      ...target,
      reason: target.reason.endsWith(".")
        ? target.reason.slice(0, -1) + "!"
        : target.reason + " ",
    };
    setRecords(next);
    setTampered(true);
    setResult(null);
  }

  async function restoreOriginal() {
    const chain = await buildChain(BASE_RECORDS);
    setRecords(chain);
    setTampered(false);
    setResult(null);
  }

  return (
    <div id="evidence" className="w-full max-w-6xl mx-auto px-6 py-24">
      <Reveal className="mb-10">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Evidence
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Don&rsquo;t trust the dashboard. Verify the evidence.</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl">
          Below is the synthetic audit trail for the blocked PR from the simulator above, in the record shape
          documented at <code className="font-mono text-[color:var(--dg-fg)]">/docs/audit</code>: each record
          commits to the hash of the one before it. This lab hashes every record with real SHA-256, via the{" "}
          <span className="text-[color:var(--dg-fg)]">Web Crypto API in your browser</span> — it does not call
          DriftGuard&rsquo;s servers and proves nothing about a live account&rsquo;s audit log. It verifies chain
          integrity only; DriftGuard doesn&rsquo;t currently claim cryptographic signatures on these records, and
          the export format is early access and may change.
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
          <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            <span>audit-record.json · acme/platform#482</span>
            <span>{records ? `${records.length} records` : "loading…"}</span>
          </div>
          <ul>
            {(records ?? []).map((r, i) => {
              const step = result?.steps.find((s) => s.seq === r.seq);
              const status: "unverified" | "ok" | "broken" | undefined = !result
                ? "unverified"
                : step?.trusted
                  ? "ok"
                  : "broken";
              return (
                <li
                  key={r.seq}
                  className={`border-b border-[color:var(--dg-border)] p-4 last:border-b-0 ${
                    i === TAMPER_INDEX && tampered ? "bg-[color-mix(in_srgb,var(--dg-blocked)_8%,transparent)]" : ""
                  }`}
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-white">
                      #{r.seq} · {r.event}
                    </span>
                    {statusBadge(status)}
                  </div>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-1 font-mono text-[11px] text-[color:var(--dg-fg-muted)] sm:grid-cols-2">
                    <div>
                      <dt className="inline text-[color:var(--dg-fg-subtle)]">pr: </dt>
                      <dd className="inline">{r.pr}</dd>
                    </div>
                    <div>
                      <dt className="inline text-[color:var(--dg-fg-subtle)]">actor: </dt>
                      <dd className="inline">{r.actor}</dd>
                    </div>
                    {r.decision && (
                      <div>
                        <dt className="inline text-[color:var(--dg-fg-subtle)]">decision: </dt>
                        <dd className="inline">{r.decision}</dd>
                      </div>
                    )}
                    <div>
                      <dt className="inline text-[color:var(--dg-fg-subtle)]">at: </dt>
                      <dd className="inline">{r.at}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="inline text-[color:var(--dg-fg-subtle)]">reason: </dt>
                      <dd className="inline">{r.reason}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[color:var(--dg-fg-subtle)]">prev_hash:</dt>
                      <dd>
                        <CopyableHash value={r.prev_hash} />
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-[color:var(--dg-fg-subtle)]">hash:</dt>
                      <dd>
                        <CopyableHash value={r.hash} />
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] p-5">
            <h4 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              Verification
            </h4>
            <ol className="mb-4 space-y-1.5 font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
              <li>1. Manifest loaded — {records ? records.length : 0} records</li>
              <li>2. Each record re-hashed with SHA-256 in your browser</li>
              <li>3. Hash compared against the record&rsquo;s stored value</li>
              <li>4. prev_hash continuity checked against the prior record</li>
              <li>
                5. Result:{" "}
                {!result
                  ? "not yet run"
                  : result.ok
                    ? "chain intact"
                    : `broken at #${result.firstFailureSeq}`}
              </li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runVerify}
                disabled={!records || verifying}
                className="touch-manipulation min-h-[44px] rounded bg-[color:var(--dg-electric)] px-4 font-mono text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.97] disabled:opacity-50"
              >
                {verifying ? "Verifying…" : "Verify evidence"}
              </button>
              <button
                type="button"
                onClick={tamperOneByte}
                disabled={!records || tampered}
                className="touch-manipulation min-h-[44px] rounded border border-[color:var(--dg-border-strong)] px-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] disabled:opacity-50"
              >
                Modify one byte
              </button>
              <button
                type="button"
                onClick={restoreOriginal}
                disabled={!tampered}
                className="touch-manipulation min-h-[44px] rounded border border-[color:var(--dg-border-strong)] px-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] disabled:opacity-50"
              >
                Restore original
              </button>
            </div>
          </div>

          <div aria-live="polite" className="sr-only">
            {result
              ? result.ok
                ? "Verification result: hash chain intact, all records trusted."
                : `Verification result: chain integrity broken starting at record ${result.firstFailureSeq}.`
              : ""}
          </div>

          {result && !result.ok && (
            <div className="rounded-lg border border-[color:var(--dg-blocked)] bg-[color-mix(in_srgb,var(--dg-blocked)_8%,transparent)] p-5">
              <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-blocked)]">
                First failing entry: #{result.firstFailureSeq}
              </h4>
              {(() => {
                const step = result.steps.find((s) => s.seq === result.firstFailureSeq);
                if (!step) return null;
                return (
                  <dl className="space-y-2 font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
                    <div>
                      <dt className="text-[color:var(--dg-fg-subtle)]">expected hash (stored):</dt>
                      <dd className="break-all">{step.expectedHash}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--dg-fg-subtle)]">calculated hash (from current content):</dt>
                      <dd className="break-all text-[color:var(--dg-blocked)]">{step.calculatedHash}</dd>
                    </div>
                  </dl>
                );
              })()}
              <p className="mt-3 text-[11px] text-[color:var(--dg-fg-muted)]">
                Every record from #{result.firstFailureSeq} onward can no longer be trusted — even though their own
                stored hashes are untouched, they&rsquo;re chained to a record whose content no longer matches what
                was sealed.
              </p>
            </div>
          )}

          {result?.ok && (
            <div className="rounded-lg border border-[color:var(--dg-allowed)] bg-[color-mix(in_srgb,var(--dg-allowed)_8%,transparent)] p-5">
              <p className="font-mono text-[11px] text-[color:var(--dg-allowed)]">
                ✓ All {result.steps.length} records re-hashed and chained correctly. Nothing in this trail has been
                altered since it was recorded.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
