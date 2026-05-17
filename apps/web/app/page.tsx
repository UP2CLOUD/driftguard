import { WaitlistForm } from "@/components/WaitlistForm";
import { auth, signIn, signOut } from "@/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen">
      <nav className="border-b border-ink/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-accent via-orange-500 to-amber-500 text-white shadow-sm shadow-accent/25">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-ink group-hover:text-accent transition-colors duration-200">
              driftguard
            </span>
          </Link>
          <div className="flex gap-6 text-sm items-center">
            <a href="#features" className="hover:text-accent">features</a>
            <a href="#pricing" className="hover:text-accent">pricing</a>
            {session ? (
              <>
                <Link href="/dashboard" className="hover:text-accent font-semibold text-ink">
                  Dashboard
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="hover:text-accent font-semibold text-muted">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <div className="flex gap-2 items-center">
                <form
                  action={async () => {
                    "use server";
                    await signIn("github", { redirectTo: "/dashboard" });
                  }}
                >
                  <button type="submit" className="rounded-full bg-ink px-4 py-1.5 text-paper hover:bg-accent transition">
                    Sign in with GitHub
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await signIn("developer-login", { redirectTo: "/dashboard" });
                  }}
                >
                  <button type="submit" className="rounded-full border border-ink/20 px-4 py-1.5 text-ink hover:border-accent hover:text-accent transition">
                    Dev Bypass
                  </button>
                </form>
              </div>
            )}
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
          {session ? (
            <div className="mt-10">
              <Link
                href="/dashboard"
                className="inline-block rounded-full bg-accent px-8 py-3 text-sm font-semibold text-paper hover:bg-ink transition shadow-lg shadow-accent/20 hover:shadow-ink/20"
              >
                Go to Dashboard →
              </Link>
            </div>
          ) : (
            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-paper hover:bg-ink transition shadow-lg shadow-accent/20 hover:shadow-ink/20"
                >
                  Get Started with GitHub
                </button>
              </form>
              <form
                action={async () => {
                  "use server";
                  await signIn("developer-login", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-full border border-ink/20 px-8 py-3 text-sm font-semibold text-ink hover:border-accent hover:text-accent transition"
                >
                  Developer Bypass (No GitHub Credentials)
                </button>
              </form>
              <div className="text-sm text-muted font-mono">or join waitlist:</div>
              <WaitlistForm />
            </div>
          )}
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
