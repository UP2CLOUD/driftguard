"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/I18nProvider";

const RULE_TYPES = [
  { value: "block", label: "Block", desc: "Prevents merge when matched" },
  { value: "warn", label: "Warn", desc: "Adds warning to PR comment" },
  { value: "alert", label: "Alert", desc: "Notifies reviewers" },
];

const SEVERITIES = ["critical", "high", "medium", "low"];

const PRESETS = [
  {
    name: "Block critical findings",
    rule_type: "block",
    severity: "critical",
    conditions: { severity: "critical" },
    description: "Block merge when any critical-severity finding is detected.",
  },
  {
    name: "Warn on public exposure",
    rule_type: "warn",
    severity: "high",
    conditions: { resource_pattern: "aws_s3_bucket_public|aws_security_group" },
    description: "Warn when public exposure patterns are detected.",
  },
  {
    name: "Block IAM wildcards",
    rule_type: "block",
    severity: "high",
    conditions: { message_contains: "wildcard", rule_id_prefix: "IAM" },
    description: "Block IAM policies with wildcard actions.",
  },
];

export function PolicyCreateForm({ installationId }: { installationId: string }) {
  const router = useRouter();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    rule_type: "block",
    severity: "high",
    description: "",
    conditions: {} as Record<string, string>,
  });

  const [condKey, setCondKey] = useState("");
  const [condVal, setCondVal] = useState("");

  function applyPreset(preset: (typeof PRESETS)[0]) {
    setForm({
      name: preset.name,
      rule_type: preset.rule_type,
      severity: preset.severity,
      description: preset.description,
      conditions: preset.conditions as unknown as Record<string, string>,
    });
  }

  function addCondition() {
    if (!condKey.trim()) return;
    setForm((f) => ({ ...f, conditions: { ...f.conditions, [condKey.trim()]: condVal.trim() } }));
    setCondKey("");
    setCondVal("");
  }

  function removeCondition(k: string) {
    setForm((f) => {
      const c = { ...f.conditions };
      delete c[k];
      return { ...f, conditions: c };
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name required"); return; }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installation_id: parseInt(installationId),
          name: form.name,
          rule_type: form.rule_type,
          severity: form.severity,
          description: form.description || undefined,
          conditions: Object.keys(form.conditions).length > 0 ? form.conditions : undefined,
          enabled: true,
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || d.error || "Failed to create policy");
      }
      setOpen(false);
      setForm({ name: "", rule_type: "block", severity: "high", description: "", conditions: {} });
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded bg-[color:var(--dg-electric)] px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white hover:brightness-110 transition"
      >
        {t("policies.addPolicy")}
      </button>
    );
  }

  return (
    <div className="rounded-md border border-[color:var(--dg-electric)]/30 bg-[color:var(--dg-surface)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)]">
          {t("policies.newPolicy")}
        </span>
        <button
          onClick={() => setOpen(false)}
          className="font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
        >
          {t("common.cancel")}
        </button>
      </div>

      {/* Presets */}
      <div className="px-4 pt-4">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] mb-2">{t("policies.quickPresets")}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => applyPreset(p)}
              className="rounded border border-[color:var(--dg-border)] px-2.5 py-1 font-mono text-[10px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] hover:border-[color:var(--dg-electric)]/40 transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="px-4 pb-4 space-y-4">
        {/* Name */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            {t("policies.nameLabel")}
          </label>
          <input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Block critical findings"
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
          />
        </div>

        {/* Rule type + Severity */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
              {t("policies.actionLabel")}
            </label>
            <select
              value={form.rule_type}
              onChange={(e) => setForm((f) => ({ ...f, rule_type: e.target.value }))}
              className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
            >
              {RULE_TYPES.map((r) => (
                <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
              {t("policies.severityLabel")}
            </label>
            <select
              value={form.severity}
              onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value }))}
              className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
            >
              {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            {t("policies.descriptionLabel")}
          </label>
          <input
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional description"
            className="w-full rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-3 py-2 font-mono text-[12px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
          />
        </div>

        {/* Conditions */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] block mb-1">
            {t("policies.conditions")}
          </label>
          {Object.entries(form.conditions).map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 mb-1.5">
              <code className="flex-1 font-mono text-[11px] text-[color:var(--dg-electric-bright)] bg-[color:var(--dg-canvas)] border border-[color:var(--dg-border)] rounded px-2 py-1">
                {k} = {v}
              </code>
              <button
                type="button"
                onClick={() => removeCondition(k)}
                className="font-mono text-[10px] text-blocked hover:text-blocked/70 transition"
              >
                ×
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={condKey}
              onChange={(e) => setCondKey(e.target.value)}
              placeholder="severity"
              className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
            />
            <input
              value={condVal}
              onChange={(e) => setCondVal(e.target.value)}
              placeholder="critical"
              className="flex-1 rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] px-2 py-1.5 font-mono text-[11px] text-[color:var(--dg-fg)] placeholder-[color:var(--dg-fg-subtle)] focus:border-[color:var(--dg-electric)] focus:outline-none transition"
            />
            <button
              type="button"
              onClick={addCondition}
              className="rounded border border-[color:var(--dg-border)] px-3 font-mono text-[11px] text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition"
            >
              +
            </button>
          </div>
        </div>

        {error && (
          <p className="font-mono text-[11px] text-blocked">✗ {error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-[color:var(--dg-electric)] py-2 font-mono text-[11px] uppercase tracking-widest text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition"
        >
          {loading ? t("policies.creating") : t("policies.createPolicy")}
        </button>
      </form>
    </div>
  );
}
