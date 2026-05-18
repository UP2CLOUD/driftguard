import { DriftguardLogo } from "@/components/DriftguardLogo";
import { HashScroll } from "@/components/HashScroll";
import { NavAnchor, NavLink, NavSubmitButton } from "@/components/NavButton";
import { WaitlistForm } from "@/components/WaitlistForm";
import { AnimatedFeatures } from "@/components/AnimatedFeatures";
import { auth } from "@/auth";
import { getLocale, getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { signInWithGitHub, signInWithDevBypass, signOutToHome } from "@/lib/auth-actions";
import Link from "next/link";

export default async function Home() {
  const session = await auth();
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const t = createTranslator(messages);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <HashScroll />
      <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <DriftguardLogo href="/" />
          <div className="flex items-center gap-1 sm:gap-2">
            <NavAnchor href="#features">{t("nav.features")}</NavAnchor>
            <NavAnchor href="#pricing">{t("nav.pricing")}</NavAnchor>
            {session ? (
              <>
                <NavLink href="/dashboard">{t("nav.dashboard")}</NavLink>
                <form action={signOutToHome}>
                  <NavSubmitButton>{t("nav.signOut")}</NavSubmitButton>
                </form>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <form
                  action={signInWithGitHub}
                >
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-semibold text-zinc-950 transition duration-150 ease-out hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90"
                  >
                    {t("nav.signInGithub")}
                  </button>
                </form>
                <form
                  action={signInWithDevBypass}
                >
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-md border border-zinc-800 px-3 py-1.5 text-sm font-semibold text-zinc-300 transition duration-150 ease-out hover:border-zinc-700 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90"
                  >
                    {t("nav.devBypass")}
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
            {t("home.badge")}
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-zinc-100 md:text-6xl">
            {t("home.titleLine1")}
            <br />
            <span className="text-zinc-400">{t("home.titleLine2")}</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-400">{t("home.subtitle")}</p>
          {session ? (
            <div className="mt-8">
              <Link
                href="/dashboard"
                className="inline-block rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600"
              >
                {t("auth.goToDashboard")}
              </Link>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <form
                action={signInWithGitHub}
              >
                <button
                  type="submit"
                  className="rounded bg-orange-500 px-6 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-orange-600"
                >
                  {t("auth.getStartedGithub")}
                </button>
              </form>
              <form
                action={signInWithDevBypass}
              >
                <button
                  type="submit"
                  className="rounded border border-zinc-800 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-zinc-700 hover:bg-zinc-800"
                >
                  {t("auth.developerBypass")}
                </button>
              </form>
              <div className="font-mono text-xs text-zinc-500">{t("auth.joinWaitlist")}</div>
              <WaitlistForm theme="dark" />
            </div>
          )}
          <p className="mt-4 text-[11px] font-mono uppercase tracking-widest text-zinc-600">{t("home.footerTagline")}</p>
        </div>
      </section>

      <section id="features" className="border-y border-zinc-900 bg-zinc-950/50">
        <AnimatedFeatures />
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-20">
        <h2 className="text-2xl font-bold tracking-tight text-zinc-100">{t("home.pricingTitle")}</h2>
        <p className="mt-2 text-sm text-zinc-400">{t("home.pricingSubtitle")}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Plan name="Free" price="€0" detail="1 repo · 50 PRs/mo · cost + drift" cta="Start free" />
          <Plan name="Pro" price="€29" detail="per repo / mo · unlimited PRs · security · Slack" cta="Start trial" featured />
          <Plan name="Team" price="€99" detail="per repo / mo · policy · autofix · priority" cta="Talk to us" />
          <Plan name="Enterprise" price="from €2.5k" detail="self-hosted · SSO · SLA · audit" cta="Contact sales" />
        </div>
      </section>

      <section id="waitlist" className="border-t border-zinc-900 bg-zinc-950 py-20 text-zinc-100">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-100 md:text-4xl">{t("home.waitlistTitle")}</h2>
          <p className="mt-4 text-sm text-zinc-400">{t("home.waitlistSubtitle")}</p>
          <div className="mt-8 flex justify-center">
            <WaitlistForm theme="dark" />
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-900 bg-zinc-950 py-6">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 font-mono text-[10px] text-zinc-500">
          <div>© 2026 Driftguard</div>
          <div className="flex gap-4">
            <a href="https://github.com/UP2CLOUD/driftguard" className="hover:text-zinc-300">
              GitHub
            </a>
            <Link href="/privacy" className="hover:text-zinc-300">
              {t("footer.privacy")}
            </Link>
            <Link href="/terms" className="hover:text-zinc-300">
              {t("footer.terms")}
            </Link>
          </div>
        </div>
      </footer>
    </main>
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
      <p className="mt-2 min-h-12 text-xs leading-relaxed text-zinc-400">{detail}</p>
      <a
        href="#waitlist"
        className={`mt-6 inline-block w-full rounded px-4 py-2 text-center text-sm font-semibold transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/50 active:scale-[0.98] active:opacity-90 ${
          featured ? "bg-orange-500 text-zinc-950 hover:bg-orange-600" : "bg-zinc-100 text-zinc-950 hover:bg-zinc-200"
        }`}
      >
        {cta}
      </a>
    </div>
  );
}
