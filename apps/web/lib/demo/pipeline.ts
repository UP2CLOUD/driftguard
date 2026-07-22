// Deterministic demo data + policy-outcome logic for the homepage review demo.
// Kept as a pure module so it can be unit-tested and shared by the marketing
// components without duplicating the sequence.

export type Verdict = "ALLOW" | "WARN" | "BLOCK";

export interface PipelineStep {
  stage: string;
  detail: string;
  verdict: Verdict;
}

// The sequence DriftGuard runs on a pull request, in order:
// plan parsed → cost → security → drift → memory recall → policy.
export const PIPELINE_STEPS: PipelineStep[] = [
  { stage: "PLAN_PARSED", detail: "aws_db_instance.main", verdict: "ALLOW" },
  { stage: "COST_DELTA", detail: "+€124/mo · rds t3.large", verdict: "WARN" },
  { stage: "SECURITY_SCAN", detail: "s3 public-acl", verdict: "BLOCK" },
  { stage: "DRIFT_CHECK", detail: "3 resources out of sync", verdict: "WARN" },
  { stage: "MEMORY_RECALL", detail: "prior incident #248", verdict: "WARN" },
  { stage: "POLICY_EVAL", detail: ".github/driftguard.yml", verdict: "BLOCK" },
];

const RANK: Record<Verdict, number> = { ALLOW: 0, WARN: 1, BLOCK: 2 };

/**
 * The merge verdict is the most severe step verdict:
 * any BLOCK → BLOCK, else any WARN → WARN, else ALLOW.
 * An empty sequence is treated as ALLOW (nothing to gate on).
 */
export function overallVerdict(steps: ReadonlyArray<{ verdict: Verdict }>): Verdict {
  return steps.reduce<Verdict>(
    (worst, s) => (RANK[s.verdict] > RANK[worst] ? s.verdict : worst),
    "ALLOW",
  );
}
