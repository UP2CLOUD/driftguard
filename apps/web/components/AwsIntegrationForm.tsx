"use client";

import { useT } from "@/components/I18nProvider";

import { useState } from "react";
import type { Org } from "@/lib/api";


const IAM_TERRAFORM_URL =
  "https://github.com/UP2CLOUD/driftguard/tree/main/infra/terraform/modules/customer-iam";

export function AwsIntegrationForm({
  installationId,
  org,
}: {
  installationId: string;
  org: Org | null;
}) {
  const t = useT();
  const externalId = org?.aws_external_id ?? `driftguard-${installationId}`;
  const [roleArn, setRoleArn] = useState(org?.aws_role_arn ?? "");
  const [stateBucket, setStateBucket] = useState(org?.aws_state_bucket ?? "");
  const [stateKey, setStateKey] = useState(org?.aws_state_key ?? "terraform.tfstate");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    if (!roleArn.startsWith("arn:aws:iam::")) {
      setError("Role ARN must start with arn:aws:iam::");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/orgs/${org?.id}/aws`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aws_role_arn: roleArn,
          state_bucket: stateBucket,
          state_key: stateKey,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] overflow-hidden">
      {/* Step 1 — create IAM role */}
      <div className="border-b border-[color:var(--dg-border)] p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="dg-label mb-1">{t("aws.step1")}</div>
            <p className="text-[12px] text-[color:var(--dg-fg-muted)] max-w-sm">
              {t("aws.deployDesc") ?? "Deploy the read-only Terraform module in your AWS account."}{" "}
              {t("aws.roleDesc") ?? "Creates a role with external ID condition — no wildcard access."}
            </p>
            <pre className="mt-3 rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[10px] text-[color:var(--dg-fg)]">
              {`module "driftguard" {\n  source = "github.com/UP2CLOUD/driftguard//infra/terraform/modules/customer-iam"\n  driftguard_aws_account_id = "<your-aws-account-id>"\n  state_bucket = "my-tfstate-bucket" # optional\n}`}
            </pre>
            <div className="mt-3 flex items-center gap-2">
              <span className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">{t("aws.externalId")}</span>
              <code className="font-mono text-[11px] text-[color:var(--dg-electric-bright)] select-all">
                {externalId}
              </code>
            </div>
          </div>
          <a
            href={IAM_TERRAFORM_URL}
            target="_blank"
            rel="noreferrer"
            className="dg-button dg-button-ghost text-[12px] shrink-0"
          >
            {t("common.viewAll") ?? "View"} →
          </a>
        </div>
      </div>

      {/* Step 2 — paste role ARN */}
      <div className="border-b border-[color:var(--dg-border)] p-5">
        <div className="dg-label mb-3">{t("aws.step2")}</div>
        <div className="space-y-3">
          <div>
            <label className="block font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1.5">
              {t("aws.roleArnLabel") ?? "Role ARN"}
            </label>
            <input
              value={roleArn}
              onChange={(e) => setRoleArn(e.target.value)}
              placeholder="arn:aws:iam::123456789012:role/DriftGuardReadOnly"
              className="w-full rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder:text-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1.5">
                {t("aws.stateBucketLabel") ?? "State bucket (optional)"}
              </label>
              <input
                value={stateBucket}
                onChange={(e) => setStateBucket(e.target.value)}
                placeholder="my-tf-state-bucket"
                className="w-full rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder:text-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
              />
            </div>
            <div>
              <label className="block font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-1.5">
                {t("aws.stateKeyLabel") ?? "State key"}
              </label>
              <input
                value={stateKey}
                onChange={(e) => setStateKey(e.target.value)}
                className="w-full rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between gap-4 p-5">
        {error && (
          <p className="font-mono text-[11px] text-blocked">{error}</p>
        )}
        {!error && saved && (
          <p className="font-mono text-[11px] text-allowed">{t("aws.savedDriftEnabled") ?? "✓ Saved — drift detection enabled"}</p>
        )}
        {!error && !saved && (
          <p className="font-sans font-medium text-[10px] text-[color:var(--dg-fg-subtle)]">
            {org?.aws_role_arn ? `Connected: ${org.aws_role_arn.slice(0, 40)}…` : (t("settings.notConnected") ?? "Not connected")}
          </p>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !roleArn || !org}
          className="dg-button dg-button-primary text-[12px] disabled:opacity-40"
        >
          {saving ? (t("common.saving") ?? "Saving…") : (t("common.save") ?? "Save")}
        </button>
      </div>
    </div>
  );
}
