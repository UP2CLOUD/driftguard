"use client";

import { useState } from "react";
import { SectionHeader } from "./Architecture";

const SAMPLES = {
  python: `from driftguard import DriftGuard

dg = DriftGuard(project="prod-infra-agent")

@dg.intercept
def execute_action(intent: AgentIntent) -> ExecResult:
    # 1. Semantic recall — sub-10ms
    similar = dg.memory.recall(intent, top_k=5)

    # 2. Policy gate — OPA / Rego
    decision = dg.policy.evaluate(intent, similar)
    if decision.blocked:
        return ExecResult.halt(decision.reason, cited=similar)

    # 3. Execute with full trace
    return dg.run(intent)`,

  typescript: `import { DriftGuard } from "@driftguard/sdk";

const dg = new DriftGuard({ project: "prod-infra-agent" });

export const executeAction = dg.intercept(async (intent) => {
  // Semantic recall + policy gate run in parallel
  const [memory, decision] = await Promise.all([
    dg.memory.recall(intent, { topK: 5 }),
    dg.policy.evaluate(intent),
  ]);

  if (decision.blocked) {
    return { halted: true, reason: decision.reason, cited: memory };
  }

  return dg.run(intent);
});`,

  rest: `# Capture an agent intent
POST https://api.driftguard.io/v1/intercept
Authorization: Bearer $DG_API_KEY
Content-Type: application/json

{
  "project": "prod-infra-agent",
  "agent": "terraform-writer",
  "intent": {
    "action": "terraform.apply",
    "plan": "...",
    "target_resources": ["aws_rds_cluster.prod"]
  }
}

# Response
HTTP/1.1 200 OK
{
  "decision": "BLOCK",
  "reason": "would delete aws_rds_cluster.prod",
  "cited_incidents": [
    { "id": "evt_8x2m", "similarity": 0.94, "date": "2026-04-22" }
  ],
  "trace_url": "https://app.driftguard.io/traces/trc_2k4p"
}`,
};

type Lang = keyof typeof SAMPLES;

export function CodeIntegration() {
  const [lang, setLang] = useState<Lang>("python");
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SAMPLES[lang]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section id="integrate" className="border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)] py-24">
      <div className="mx-auto max-w-[1400px] px-6">
        <SectionHeader
          eyebrow="Integrate"
          title="Drop in. Three lines."
          subtitle="SDK for Python, TypeScript, Go, Rust. REST + gRPC for everything else. No agent retraining, no infrastructure changes."
        />

        <div className="mt-12 rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] overflow-hidden">
          {/* Tab bar */}
          <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]">
            <div className="flex">
              {(Object.keys(SAMPLES) as Lang[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setLang(k)}
                  className={`relative px-4 py-3 font-mono text-[11px] uppercase tracking-widest transition
                    ${lang === k
                      ? "text-[color:var(--dg-fg)]"
                      : "text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg-muted)]"
                    }`}
                >
                  {k}
                  {lang === k && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2px] bg-[color:var(--dg-electric)]" />
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={copy}
              className="mr-3 font-mono text-[10px] uppercase tracking-wider text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              {copied ? "✓ copied" : "▸ copy"}
            </button>
          </div>

          {/* Code body */}
          <div className="relative">
            <pre className="overflow-x-auto p-6 font-mono text-[13px] leading-relaxed text-[color:var(--dg-fg)]">
              <code>{SAMPLES[lang]}</code>
            </pre>
            {/* Line numbers gutter */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 border-r border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)]/40" />
          </div>

          {/* Bottom strip */}
          <div className="flex items-center justify-between border-t border-[color:var(--dg-border)] px-4 py-2 font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">
            <span>sdk.driftguard.io ▪ semver 0.4.2 ▪ {SAMPLES[lang].split("\n").length} lines</span>
            <a href="/docs" className="text-[color:var(--dg-electric-bright)] hover:underline">▸ full docs</a>
          </div>
        </div>

        {/* Sub-CTA: framework chips */}
        <div className="mt-6 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="dg-label">First-class integrations</span>
          {["LangChain", "LangGraph", "LlamaIndex", "Mastra", "AutoGen", "CrewAI", "Cursor", "Devin"].map((f) => (
            <span
              key={f}
              className="rounded border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)]/60 px-2 py-1 font-mono text-[10px] text-[color:var(--dg-fg-muted)] hover:border-[color:var(--dg-border-bright)] hover:text-[color:var(--dg-fg)] transition cursor-default"
            >
              {f}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
