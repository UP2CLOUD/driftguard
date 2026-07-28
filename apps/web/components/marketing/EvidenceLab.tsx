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
import { useT } from "@/components/TranslationProvider";

const TAMPER_INDEX = 2; // the "policy: no-public-buckets matched" check_result record

function CopyableHash({ value }: { value: string }) {
  const t = useT();
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
        aria-label={copied ? t("marketing.evidence.copyAriaCopied") : t("marketing.evidence.copyAriaCopy", { hash: value })}
        className="touch-manipulation min-h-[28px] rounded border border-[color:var(--dg-border-strong)] px-2 font-mono text-[9px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)]"
      >
        {copied ? t("marketing.evidence.copied") : t("marketing.evidence.copy")}
      </button>
    </span>
  );
}

function statusBadge(status: "unverified" | "ok" | "broken" | undefined, t: ReturnType<typeof useT>) {
  if (status === "ok") {
    return (
      <span className="rounded border border-[color:var(--dg-allowed)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-allowed)]">
        ✓ {t("marketing.evidence.statusIntact")}
      </span>
    );
  }
  if (status === "broken") {
    return (
      <span className="rounded border border-[color:var(--dg-blocked)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-blocked)]">
        ✗ {t("marketing.evidence.statusBroken")}
      </span>
    );
  }
  return (
    <span className="rounded border border-[color:var(--dg-border-strong)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
      {t("marketing.evidence.statusNotVerified")}
    </span>
  );
}

export function EvidenceLab() {
  const t = useT();
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
          {t("marketing.evidence.eyebrow")}
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">{t("marketing.evidence.title")}</h3>
        <p className="text-[color:var(--dg-fg-muted)] max-w-2xl">
          {t("marketing.evidence.body")}
        </p>
      </Reveal>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
          <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            <span>audit-record.json · acme/platform#482</span>
            <span>{records ? t("marketing.evidence.recordsCount", { count: records.length }) : t("marketing.evidence.loadingLabel")}</span>
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
                    {statusBadge(status, t)}
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
              {t("marketing.evidence.verificationHeader")}
            </h4>
            <ol className="mb-4 space-y-1.5 font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
              <li>1. {t("marketing.evidence.step1", { count: records ? records.length : 0 })}</li>
              <li>2. {t("marketing.evidence.step2")}</li>
              <li>3. {t("marketing.evidence.step3")}</li>
              <li>4. {t("marketing.evidence.step4")}</li>
              <li>
                5. {t("marketing.evidence.resultLabel")}{" "}
                {!result
                  ? t("marketing.evidence.resultNotRun")
                  : result.ok
                    ? t("marketing.evidence.resultIntact")
                    : t("marketing.evidence.resultBroken", { seq: result.firstFailureSeq ?? 0 })}
              </li>
            </ol>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={runVerify}
                disabled={!records || verifying}
                className="touch-manipulation min-h-[44px] rounded bg-[color:var(--dg-electric)] px-4 font-mono text-[11px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.97] disabled:opacity-50"
              >
                {verifying ? t("marketing.evidence.btnVerifying") : t("marketing.evidence.btnVerify")}
              </button>
              <button
                type="button"
                onClick={tamperOneByte}
                disabled={!records || tampered}
                className="touch-manipulation min-h-[44px] rounded border border-[color:var(--dg-border-strong)] px-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] disabled:opacity-50"
              >
                {t("marketing.evidence.btnTamper")}
              </button>
              <button
                type="button"
                onClick={restoreOriginal}
                disabled={!tampered}
                className="touch-manipulation min-h-[44px] rounded border border-[color:var(--dg-border-strong)] px-4 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-fg)] transition-colors hover:bg-[color:var(--dg-surface-raised)] active:scale-[0.97] disabled:opacity-50"
              >
                {t("marketing.evidence.btnRestore")}
              </button>
            </div>
          </div>

          <div aria-live="polite" className="sr-only">
            {result
              ? result.ok
                ? t("marketing.evidence.srVerifyOk")
                : t("marketing.evidence.srVerifyBroken", { seq: result.firstFailureSeq ?? 0 })
              : ""}
          </div>

          {result && !result.ok && (
            <div className="rounded-lg border border-[color:var(--dg-blocked)] bg-[color-mix(in_srgb,var(--dg-blocked)_8%,transparent)] p-5">
              <h4 className="mb-2 font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-blocked)]">
                {t("marketing.evidence.firstFailingEntry", { seq: result.firstFailureSeq ?? 0 })}
              </h4>
              {(() => {
                const step = result.steps.find((s) => s.seq === result.firstFailureSeq);
                if (!step) return null;
                return (
                  <dl className="space-y-2 font-mono text-[11px] text-[color:var(--dg-fg-muted)]">
                    <div>
                      <dt className="text-[color:var(--dg-fg-subtle)]">{t("marketing.evidence.expectedHash")}</dt>
                      <dd className="break-all">{step.expectedHash}</dd>
                    </div>
                    <div>
                      <dt className="text-[color:var(--dg-fg-subtle)]">{t("marketing.evidence.calculatedHash")}</dt>
                      <dd className="break-all text-[color:var(--dg-blocked)]">{step.calculatedHash}</dd>
                    </div>
                  </dl>
                );
              })()}
              <p className="mt-3 text-[11px] text-[color:var(--dg-fg-muted)]">
                {t("marketing.evidence.brokenExplain", { seq: result.firstFailureSeq ?? 0 })}
              </p>
            </div>
          )}

          {result?.ok && (
            <div className="rounded-lg border border-[color:var(--dg-allowed)] bg-[color-mix(in_srgb,var(--dg-allowed)_8%,transparent)] p-5">
              <p className="font-mono text-[11px] text-[color:var(--dg-allowed)]">
                {t("marketing.evidence.allOk", { count: result.steps.length })}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
