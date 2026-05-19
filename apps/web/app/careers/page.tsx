import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Careers — DriftGuard" };

const ROLES = [
  {
    title: "Staff Backend Engineer",
    type: "Full-time",
    location: "Remote (EU)",
    team: "Platform",
    desc: "Own the analyzer pipeline — Terraform plan parsing, Checkov integration, semantic embedding, and the PR comment engine. Stack: Python, FastAPI, GCP Cloud Run.",
  },
  {
    title: "Developer Advocate",
    type: "Full-time",
    location: "Remote (EU / US-East)",
    team: "Growth",
    desc: "Build the community of engineers and platform teams using DriftGuard. Write technical content, speak at KubeCon / HashiConf, and own the docs developer experience.",
  },
];

export default function Careers() {
  return (
    <MarketingPageShell
      eyebrow="Careers"
      title="Build the safety layer for AI-generated infrastructure."
      subtitle="We're a small, early team. Every hire shapes the product and the culture."
      narrow
    >
      {/* Values */}
      <section className="mb-12">
        <div className="dg-label mb-4">How we work</div>
        <div className="grid gap-px bg-[color:var(--dg-border)] rounded-md overflow-hidden border border-[color:var(--dg-border)] sm:grid-cols-3">
          {[
            { h: "Remote-first", b: "Async by default. We hire across EU and occasionally US-East timezones. No RTO, ever." },
            { h: "Small team", b: "Every person has outsized ownership. We ship fast, learn in production, and iterate openly." },
            { h: "Technical depth", b: "We solve hard problems — embeddings, policy engines, semantic diff at scale. We go deep." },
          ].map((v) => (
            <div key={v.h} className="bg-[color:var(--dg-canvas)] p-6">
              <div className="text-[14px] font-semibold text-[color:var(--dg-fg)] mb-2">{v.h}</div>
              <div className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)]">{v.b}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Open roles */}
      <section className="mb-12">
        <div className="dg-label mb-4">Open roles</div>
        <div className="space-y-3">
          {ROLES.map((r) => (
            <div key={r.title} className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)]">{r.title}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">{r.team}</span>
                    <span className="text-[color:var(--dg-fg-subtle)]">·</span>
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{r.location}</span>
                    <span className="text-[color:var(--dg-fg-subtle)]">·</span>
                    <span className="font-mono text-[10px] text-[color:var(--dg-fg-subtle)]">{r.type}</span>
                  </div>
                </div>
                <a href={`mailto:careers@driftguard.io?subject=${encodeURIComponent(r.title)}`}
                  className="dg-button dg-button-primary text-[11px] shrink-0">Apply →</a>
              </div>
              <p className="text-[12px] leading-relaxed text-[color:var(--dg-fg-muted)]">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="rounded-md border border-[color:var(--dg-border)] bg-[color:var(--dg-surface)] p-5 flex items-center justify-between gap-4">
        <p className="text-[13px] text-[color:var(--dg-fg-muted)]">Don&apos;t see a fit? We still want to hear from you.</p>
        <a href="mailto:careers@driftguard.io" className="dg-button dg-button-ghost text-[12px]">Send a note</a>
      </div>
    </MarketingPageShell>
  );
}
