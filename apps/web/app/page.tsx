import { WaitlistForm } from "@/components/WaitlistForm";

export default function Home() {
  return (
    <main className="min-h-screen">
      <nav className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="font-display text-lg font-bold tracking-tight">driftguard</div>
          <div className="flex gap-6 text-sm">
            <a href="#features" className="hover:text-accent">features</a>
            <a href="#pricing" className="hover:text-accent">pricing</a>
            <a href="#waitlist" className="rounded-full bg-ink px-4 py-1.5 text-paper hover:bg-accent">
              Get early access
            </a>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-3xl">
          <div className="mb-4 inline-block rounded-full border border-ink/20 px-3 py-1 text-xs uppercase tracking-widest">
            beta · invite only · EU
          </div>
          <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            OpenTofu PR reviews.
            <br />
            <span className="text-accent">EU compliance baked in.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted">
            Driftguard reviews every OpenTofu and Terraform PR in 30 seconds. Cost delta,
            drift risk, security misconfigs, and DORA / NIS2 / ISO 27001 evidence — unified
            in one PR comment.
          </p>
          <div className="mt-10">
            <WaitlistForm />
          </div>
          <p className="mt-4 text-xs text-muted">
            EU-hosted. GDPR-native. No spam.
          </p>
        </div>
      </section>

      <section id="features" className="border-y border-ink/10 bg-white/40">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-3">
          <Feature
            title="Cost delta"
            body="Every PR comment shows monthly cost impact, by resource. Powered by terraform plan + cost engine. No surprises."
          />
          <Feature
            title="Drift detection"
            body="Compares HEAD against real cloud state. Flags drift caused by humans or other agents before merge."
          />
          <Feature
            title="Security findings"
            body="Curated rules + AI triage. Only the findings that matter, ranked by blast radius."
          />
          <Feature
            title="AI summary"
            body="Claude Sonnet synthesizes findings into a high-signal PR review. No hallucination — every claim cites a resource."
          />
          <Feature
            title="EU compliance"
            body="DORA, NIS2, ISO 27001 control mapping per resource. Audit-ready evidence collected on every PR — without questionnaires."
          />
          <Feature
            title="Policy-as-code"
            body="Bring your OPA or YAML policies. Driftguard enforces them per repo, with audit trail."
          />
          <Feature
            title="OpenTofu native"
            body="OpenTofu first-class, Terraform supported. Multi-cloud (AWS, GCP, Azure). No HashiCorp Cloud lock-in."
          />
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
        <h2 className="font-display text-3xl font-bold md:text-4xl">Pricing</h2>
        <p className="mt-2 text-muted">Per-repo. Annual saves 15%.</p>
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          <Plan name="Free" price="€0" detail="1 repo · 50 PRs/mo · cost + drift" cta="Start free" />
          <Plan name="Pro" price="€29" detail="per repo / mo · unlimited PRs · security · Slack" cta="Start trial" featured />
          <Plan name="Team" price="€99" detail="per repo / mo · policy · autofix · priority" cta="Talk to us" />
          <Plan name="Enterprise" price="from €2.5k" detail="self-hosted · SSO · SLA · audit" cta="Contact sales" />
        </div>
      </section>

      <section id="waitlist" className="border-t border-ink/10 bg-ink py-24 text-paper">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold md:text-5xl">
            Be the first to ship safer infra.
          </h2>
          <p className="mt-4 text-paper/70">
            Early access opens to 50 platform teams. First 20 get lifetime 50% off.
          </p>
          <div className="mt-10 flex justify-center">
            <WaitlistForm theme="dark" />
          </div>
        </div>
      </section>

      <footer className="border-t border-ink/10 py-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 text-sm text-muted">
          <div>© 2026 Driftguard</div>
          <div className="flex gap-6">
            <a href="https://github.com" className="hover:text-accent">GitHub</a>
            <a href="/privacy" className="hover:text-accent">Privacy</a>
            <a href="/terms" className="hover:text-accent">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <div className="mb-3 font-display text-sm uppercase tracking-widest text-accent">{title}</div>
      <p className="text-ink/80">{body}</p>
    </div>
  );
}

function Plan({
  name,
  price,
  detail,
  cta,
  featured,
}: {
  name: string;
  price: string;
  detail: string;
  cta: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 ${
        featured ? "border-accent bg-accent/5" : "border-ink/15 bg-white/40"
      }`}
    >
      <div className="font-display text-xs uppercase tracking-widest text-muted">{name}</div>
      <div className="mt-3 font-display text-3xl font-bold">{price}</div>
      <p className="mt-2 min-h-12 text-sm text-muted">{detail}</p>
      <a
        href="#waitlist"
        className={`mt-6 inline-block w-full rounded-full px-4 py-2 text-center text-sm ${
          featured ? "bg-accent text-paper" : "bg-ink text-paper"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
