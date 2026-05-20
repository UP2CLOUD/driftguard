import { MarketingPageShell } from "@/components/MarketingPageShell";
export const metadata = { title: "Semantic Memory — DriftGuard Docs" };
export default function Memory() {
  return (
    <MarketingPageShell eyebrow="Docs · Core concepts" title="Semantic memory" subtitle="How DriftGuard remembers failures and recalls them at PR review time." narrow>
      <div className="space-y-8 text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
        <Section title="What gets stored">
          Every finding from every PR analysis is converted into a 384-dimensional embedding using the Voyage-3-lite model. The embedding captures: the resource type, the change intent, the blast radius, and the severity. It is stored in a pgvector index alongside the original finding text, the repository, the PR number, and the outcome (blocked / allowed).
        </Section>
        <Section title="How recall works">
          When a new PR arrives, its plan diff is embedded using the same model. A cosine similarity search returns the top-k most similar past incidents with similarity ≥ 0.5. Results are attached to the PR comment as citations.
        </Section>
        <Section title="Retention and isolation">
          Memory is isolated per organisation. No cross-tenant recall. On the Team plan, retention is 365 days. On Enterprise, unlimited. Memory is encrypted at rest (AES-256).
        </Section>
        <Section title="API access">
          You can query the memory index directly via <code className="font-mono text-[color:var(--dg-electric-bright)]">POST /api/v1/memory/recall</code>. See the <a href="/docs/api" className="text-[color:var(--dg-electric-bright)] hover:underline">API reference</a> for the full schema.
        </Section>
      </div>
    </MarketingPageShell>
  );
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{title}</h2>
      <p>{children}</p>
    </div>
  );
}
