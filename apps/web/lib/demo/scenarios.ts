// Synthetic PR-review scenarios for the interactive homepage simulator.
// Every field uses DriftGuard's real, documented vocabulary — the six
// analysis engines, the allow/warn/block verdict tiers, and the
// `.github/driftguard.yml` policy file (see RuntimeArchitectureMap.tsx and
// app/docs/policies) — nothing here is an invented product concept. All
// data is illustrative/deterministic, clearly not a live tenant's PRs.

import { type Verdict, overallVerdict } from "./pipeline";

export interface EngineResult {
  /** Matches the six real analysis engines, see RuntimeArchitectureMap.tsx */
  key: "plan" | "cost" | "security" | "drift" | "recall" | "policy";
  stage: string;
  detail: string;
  verdict: Verdict;
}

export interface Scenario {
  id: string;
  /** Illustrative category label, not a distinct product mode. */
  category: string;
  repo: string;
  prNumber: number;
  title: string;
  author: string;
  diff: string;
  engines: EngineResult[];
  /** The `.github/driftguard.yml` rule id that decided the final verdict. */
  rule: string;
  explanation: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: "public-bucket",
    category: "Production infrastructure",
    repo: "acme/platform",
    prNumber: 482,
    title: "Add S3 bucket for build artifacts",
    author: "octocat",
    diff: `resource "aws_s3_bucket" "assets" {
  bucket = "acme-build-artifacts"
+ acl    = "public-read"
}`,
    engines: [
      { key: "plan", stage: "Plan parsed", detail: "1 resource added: aws_s3_bucket.assets", verdict: "ALLOW" },
      { key: "cost", stage: "Cost delta", detail: "+€3/mo · s3 standard storage", verdict: "ALLOW" },
      { key: "security", stage: "Security scan", detail: "aws_s3_bucket.assets → public-read ACL", verdict: "BLOCK" },
      { key: "drift", stage: "Drift check", detail: "0 resources out of sync with live state", verdict: "ALLOW" },
      { key: "recall", stage: "Semantic recall", detail: "similar to incident #248 (public bucket, Mar 2026)", verdict: "WARN" },
      { key: "policy", stage: "Policy gate", detail: "no-public-buckets", verdict: "BLOCK" },
    ],
    rule: "no-public-buckets",
    explanation:
      "aws_s3_bucket.assets sets acl = \"public-read\", which is explicitly denied by the no-public-buckets rule regardless of cost or drift results.",
  },
  {
    id: "rds-cost-spike",
    category: "Cost & FinOps",
    repo: "acme/platform",
    prNumber: 511,
    title: "Bump prod RDS instance class for reporting load",
    author: "priya-eng",
    diff: `resource "aws_db_instance" "main" {
- instance_class = "db.r6g.xlarge"
+ instance_class = "db.r6g.4xlarge"
}`,
    engines: [
      { key: "plan", stage: "Plan parsed", detail: "1 resource changed: aws_db_instance.main", verdict: "ALLOW" },
      { key: "cost", stage: "Cost delta", detail: "+€1,840/mo · exceeds €500/mo change threshold", verdict: "WARN" },
      { key: "security", stage: "Security scan", detail: "no new findings", verdict: "ALLOW" },
      { key: "drift", stage: "Drift check", detail: "0 resources out of sync with live state", verdict: "ALLOW" },
      { key: "recall", stage: "Semantic recall", detail: "no related prior incidents", verdict: "ALLOW" },
      { key: "policy", stage: "Policy gate", detail: "cost-budget-threshold", verdict: "WARN" },
    ],
    rule: "cost-budget-threshold",
    explanation:
      "The cost delta (+€1,840/mo) exceeds the configured €500/mo change threshold, so the policy gate escalates to WARN and requires an approval before merge instead of blocking outright.",
  },
  {
    id: "iam-wildcard",
    category: "Identity & access",
    repo: "acme/platform",
    prNumber: 497,
    title: "Grant CI role permissions to deploy Lambda functions",
    author: "github-actions[bot]",
    diff: `resource "aws_iam_role_policy" "ci_deploy" {
  policy = jsonencode({
    Statement = [{
      Effect   = "Allow"
+     Action   = "*"
+     Resource = "*"
    }]
  })
}`,
    engines: [
      { key: "plan", stage: "Plan parsed", detail: "1 resource added: aws_iam_role_policy.ci_deploy", verdict: "ALLOW" },
      { key: "cost", stage: "Cost delta", detail: "no billable resources", verdict: "ALLOW" },
      { key: "security", stage: "Security scan", detail: "aws_iam_role_policy.ci_deploy → Action:\"*\" Resource:\"*\"", verdict: "BLOCK" },
      { key: "drift", stage: "Drift check", detail: "0 resources out of sync with live state", verdict: "ALLOW" },
      { key: "recall", stage: "Semantic recall", detail: "similar to incident #201 (overly broad CI role)", verdict: "WARN" },
      { key: "policy", stage: "Policy gate", detail: "no-wildcard-iam", verdict: "BLOCK" },
    ],
    rule: "no-wildcard-iam",
    explanation:
      "aws_iam_role_policy.ci_deploy grants Action:\"*\" on Resource:\"*\" — a wildcard IAM grant — which the no-wildcard-iam rule blocks outright, independent of who or what authored the change.",
  },
  {
    id: "asg-drift",
    category: "Production infrastructure",
    repo: "acme/platform",
    prNumber: 523,
    title: "Increase autoscaling group minimum size",
    author: "priya-eng",
    diff: `resource "aws_autoscaling_group" "web" {
- min_size = 2
+ min_size = 4
}`,
    engines: [
      { key: "plan", stage: "Plan parsed", detail: "1 resource changed: aws_autoscaling_group.web", verdict: "ALLOW" },
      { key: "cost", stage: "Cost delta", detail: "+€96/mo · 2 additional instances", verdict: "ALLOW" },
      { key: "security", stage: "Security scan", detail: "no new findings", verdict: "ALLOW" },
      { key: "drift", stage: "Drift check", detail: "4 resources modified outside Terraform since last apply", verdict: "WARN" },
      { key: "recall", stage: "Semantic recall", detail: "no related prior incidents", verdict: "ALLOW" },
      { key: "policy", stage: "Policy gate", detail: "drift-review-required", verdict: "WARN" },
    ],
    rule: "drift-review-required",
    explanation:
      "Live state has diverged from the last known-good Terraform apply on 4 resources. drift-review-required holds the merge for manual review so the plan isn't applied on top of an inconsistent baseline.",
  },
  {
    id: "clean-read-replica",
    category: "Production infrastructure",
    repo: "acme/platform",
    prNumber: 534,
    title: "Add read replica for the reporting database",
    author: "priya-eng",
    diff: `resource "aws_db_instance" "reporting_replica" {
  replicate_source_db = aws_db_instance.main.id
  instance_class       = "db.r6g.large"
}`,
    engines: [
      { key: "plan", stage: "Plan parsed", detail: "1 resource added: aws_db_instance.reporting_replica", verdict: "ALLOW" },
      { key: "cost", stage: "Cost delta", detail: "+€210/mo · within team budget", verdict: "ALLOW" },
      { key: "security", stage: "Security scan", detail: "no new findings", verdict: "ALLOW" },
      { key: "drift", stage: "Drift check", detail: "0 resources out of sync with live state", verdict: "ALLOW" },
      { key: "recall", stage: "Semantic recall", detail: "no related prior incidents", verdict: "ALLOW" },
      { key: "policy", stage: "Policy gate", detail: "all checks passed", verdict: "ALLOW" },
    ],
    rule: "all-checks-passed",
    explanation:
      "Every engine returned ALLOW: the change is within budget, introduces no security findings, matches live state, and has no related incident history — the policy gate lets it merge without a human in the loop.",
  },
];

export function scenarioVerdict(scenario: Scenario): Verdict {
  return overallVerdict(scenario.engines);
}
