import { WaitlistForm } from "@/components/WaitlistForm";
import { auth, signIn, signOut } from "@/auth";
import Link from "next/link";

export default async function Home() {
  const session = await auth();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <nav className="border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-base font-bold tracking-tight text-zinc-100 lowercase">
              driftguard
            </span>
          </Link>
          <div className="flex gap-5 text-sm items-center">
            <a href="#features" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">features</a>
            <a href="#pricing" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">pricing</a>
            {session ? (
              <>
                <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">
                  Dashboard
                </Link>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button type="submit" className="text-zinc-400 hover:text-zinc-100 font-medium transition-colors">
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
                  <button type="submit" className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-zinc-200 transition">
                    Sign in with GitHub
                  </button>
                </form>
                <form
                  action={async () => {
                    "use server";
                    await signIn("developer-login", { redirectTo: "/dashboard" });
                  }}
                >
                  <button type="submit" className="rounded border border-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 transition">
                    Dev Bypass
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="max-w-3xl">
          <div className="mb-4 inline-flex items-center rounded border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">
            beta · invite only · EU
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight md:text-6xl text-zinc-100">
            OpenTofu PR reviews.
            <br />
            <span className="text-zinc-400">EU compliance baked in.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base text-zinc-400 leading-relaxed">
            Driftguard reviews every OpenTofu and Terraform PR in 30 seconds. Cost delta,
            drift risk, security misconfigs, and DORA / NIS2 / ISO 27001 evidence — unified
            in one PR comment.
          </p>
          {session ? (
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-block rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-orange-600 transition"
              >
                Go to Dashboard →
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-4 items-center">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: "/dashboard" });
                }}
              >
                <button
                  type="submit"
                  className="rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-orange-600 transition"
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
                  className="rounded border border-zinc-800 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800 transition"
                >
                  Developer Bypass (No GitHub Credentials)
                </button>
              </form>
              <div className="text-xs text-zinc-500 font-mono">or join waitlist:</div>
              <WaitlistForm theme="dark" />
            </div>
          )}
          <p className="mt-4 text-[11px] font-mono uppercase tracking-widest text-zinc-600">
            EU-hosted. GDPR-native. No spam.
          </p>
        </div>
      </section>

      <section id="features" className="border-y border-zinc-900 bg-zinc-950/50">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 md:grid-cols-3">
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

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">Pricing</h2>
        <p className="mt-2 text-sm text-zinc-400">Per-repo. Annual saves 15%.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Plan name="Free" price="€0" detail="1 repo · 50 PRs/mo · cost + drift" cta="Start free" />
          <Plan name="Pro" price="€29" detail="per repo / mo · unlimited PRs · security · Slack" cta="Start trial" featured />
          <Plan name="Team" price="€99" detail="per repo / mo · policy · autofix · priority" cta="Talk to us" />
          <Plan name="Enterprise" price="from €2.5k" detail="self-hosted · SSO · SLA · audit" cta="Contact sales" />
        </div>
      </section>

      <section id="waitlist" className="border-t border-zinc-900 bg-zinc-950 py-20 text-zinc-100">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-zinc-100">
            Be the first to ship safer infra.
          </h2>
          <p className="mt-4 text-sm text-zinc-400">
            Early access opens to 50 platform teams. First 20 get lifetime 50% off.
          </p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm theme="dark" />
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 py-6 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 text-[10px] text-zinc-500 font-mono">
          <div>© 2026 Driftguard</div>
          <div className="flex gap-4">
            <a href="https://github.com" className="hover:text-zinc-300">GitHub</a>
            <a href="/privacy" className="hover:text-zinc-300">Privacy</a>
            <a href="/terms" className="hover:text-zinc-300">Terms</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded border border-zinc-900 bg-zinc-900/20 p-5">
      <div className="mb-2 text-[10px] font-mono font-bold uppercase tracking-wider text-orange-400">{title}</div>
      <p className="text-sm text-zinc-400 leading-relaxed">{body}</p>
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
      className={`rounded-lg border p-5 ${
        featured ? "border-orange-500/30 bg-orange-500/5" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400">{name}</div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-zinc-100">{price}</div>
      <p className="mt-2 min-h-12 text-xs text-zinc-400 leading-relaxed">{detail}</p>
      <a
        href="#waitlist"
        className={`mt-6 inline-block w-full rounded px-4 py-2 text-center text-sm font-semibold transition ${
          featured ? "bg-orange-500 text-zinc-950 hover:bg-orange-600" : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
