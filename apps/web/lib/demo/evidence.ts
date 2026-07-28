// Synthetic evidence package + real SHA-256 hash-chain verification for the
// homepage "evidence lab". The record shape matches the one documented at
// /docs/audit (seq, prev_hash, hash, event, pr, decision, reason, actor, at)
// — that page's own copy: "DriftGuard is early access; the export format
// may change." This module hashes with the real Web Crypto API in the
// visitor's browser; it does not call any backend and proves nothing about
// a live account's audit log. See EvidenceLab.tsx for the disclosure copy
// shown alongside it.

export interface EvidenceRecordInput {
  seq: number;
  event: string;
  pr: string;
  decision?: string;
  reason: string;
  actor: string;
  at: string;
}

export interface EvidenceRecord extends EvidenceRecordInput {
  prev_hash: string;
  hash: string;
}

export interface VerifyStep {
  seq: number;
  /** Does a fresh SHA-256 of this record's own fields match its stored hash? */
  hashOk: boolean;
  /** Does this record's prev_hash pointer match the previous record's stored hash? */
  chainOk: boolean;
  /**
   * hashOk && chainOk && every earlier record's `trusted`. A single tampered
   * record breaks trust for itself and everything chained after it, even
   * though later records' own stored hash/pointer values are untouched —
   * their authenticity can no longer be confirmed once an earlier link in
   * the chain they depend on is known to be broken.
   */
  trusted: boolean;
  expectedHash: string;
  calculatedHash: string;
}

export interface VerifyResult {
  ok: boolean;
  steps: VerifyStep[];
  firstFailureSeq: number | null;
}

export const GENESIS_HASH = "sha256:0000000000000000000000000000000000000000000000000000000000000000";

// The base narrative — one PR's evidence trail, told through the record
// types /docs/audit documents: analysis started, check results, a merge
// decision, and a manual override.
export const BASE_RECORDS: EvidenceRecordInput[] = [
  {
    seq: 10480,
    event: "analysis_started",
    pr: "acme/platform#482",
    reason: "PR opened — 1 resource added: aws_s3_bucket.assets",
    actor: "driftguard-bot",
    at: "2026-07-21T10:03:58Z",
  },
  {
    seq: 10481,
    event: "check_result",
    pr: "acme/platform#482",
    reason: "security: aws_s3_bucket.assets → public-read ACL",
    actor: "driftguard-bot",
    at: "2026-07-21T10:04:05Z",
  },
  {
    seq: 10482,
    event: "check_result",
    pr: "acme/platform#482",
    reason: "policy: no-public-buckets matched",
    actor: "driftguard-bot",
    at: "2026-07-21T10:04:09Z",
  },
  {
    seq: 10483,
    event: "merge_decision",
    pr: "acme/platform#482",
    decision: "block",
    reason: "policy: no-public-buckets",
    actor: "driftguard-bot",
    at: "2026-07-21T10:04:11Z",
  },
  {
    seq: 10484,
    event: "override",
    pr: "acme/platform#482",
    decision: "allow",
    reason: "false positive — internal artifacts bucket, restricted via bucket policy instead of ACL",
    actor: "github:octocat",
    at: "2026-07-21T14:22:47Z",
  },
];

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `sha256:${hex}`;
}

/** Deterministic string form of everything a record commits to, excluding its own hash. */
function canonicalize(record: EvidenceRecordInput & { prev_hash: string }): string {
  return JSON.stringify({
    seq: record.seq,
    prev_hash: record.prev_hash,
    event: record.event,
    pr: record.pr,
    decision: record.decision ?? null,
    reason: record.reason,
    actor: record.actor,
    at: record.at,
  });
}

/** Builds the hash chain from scratch — each record's hash folds in the previous record's hash. */
export async function buildChain(base: EvidenceRecordInput[]): Promise<EvidenceRecord[]> {
  const out: EvidenceRecord[] = [];
  let prevHash = GENESIS_HASH;
  for (const record of base) {
    const hash = await sha256Hex(canonicalize({ ...record, prev_hash: prevHash }));
    out.push({ ...record, prev_hash: prevHash, hash });
    prevHash = hash;
  }
  return out;
}

/**
 * Recomputes every record's hash from its current field values and checks:
 * 1. hashOk    — the stored `hash` still matches a fresh SHA-256 of the record's fields
 * 2. chainOk   — the record's `prev_hash` still matches the previous record's stored hash
 * A tampered record fails hashOk immediately; every later record fails chainOk,
 * because the chain was built over the pre-tamper hash.
 */
export async function verifyChain(records: EvidenceRecord[]): Promise<VerifyResult> {
  const steps: VerifyStep[] = [];
  let firstFailureSeq: number | null = null;
  let chainTrusted = true;

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const calculatedHash = await sha256Hex(canonicalize(record));
    const hashOk = calculatedHash === record.hash;
    const expectedPrev = i === 0 ? GENESIS_HASH : records[i - 1].hash;
    const chainOk = record.prev_hash === expectedPrev;

    chainTrusted = chainTrusted && hashOk && chainOk;
    steps.push({ seq: record.seq, hashOk, chainOk, trusted: chainTrusted, expectedHash: record.hash, calculatedHash });
    if (!chainTrusted) {
      firstFailureSeq ??= record.seq;
    }
  }

  return { ok: firstFailureSeq === null, steps, firstFailureSeq };
}
