import Link from "next/link";
import { LocaleSwitcher } from "../LocaleSwitcher";
import { getUserPreferences } from "@/lib/preferences/server";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";

export async function Footer() {
  const preferences = await getUserPreferences();
  const messages    = await getMessages(preferences.locale);
  const t           = createTranslator(messages);
  const commitSha   = (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7);

  return (
    <footer className="border-t border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 pt-12 sm:pt-16 pb-10 sm:pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">

          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
                <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
              </svg>
              <span className="font-sans text-base font-semibold tracking-tight text-[color:var(--dg-fg)]">driftguard</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-allowed opacity-50 dg-pulse" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-allowed" />
              </span>
              <span className="font-mono text-[10px] text-allowed">{t("landing.footer.status")}</span>
            </div>
          </div>

          {/* Product */}
          <FootCol title={t("landing.footer.colProduct")} links={[
            { l: t("landing.footer.linkPricing"),   h: "/pricing" },
            { l: t("landing.footer.linkChangelog"),  h: "/changelog" },
            { l: t("landing.footer.linkCustomers"),  h: "/customers" },
            { l: t("landing.footer.linkSecurity"),   h: "/security" },
            { l: t("landing.footer.linkCompliance"), h: "/compliance" },
          ]} />

          {/* Docs */}
          <FootCol title={t("landing.footer.colDocs")} links={[
            { l: t("landing.footer.linkGetStarted"),  h: "/docs/install" },
            { l: t("landing.footer.linkFirstReview"), h: "/docs/first-review" },
            { l: t("landing.footer.linkCost"),        h: "/docs/cost" },
            { l: t("landing.footer.linkDrift"),       h: "/docs/drift" },
            { l: t("landing.footer.linkMemory"),      h: "/docs/memory" },
            { l: t("landing.footer.linkPolicies"),    h: "/docs/policies" },
            { l: t("landing.footer.linkApiRef"),      h: "/docs/api" },
            { l: t("landing.footer.linkWebhooks"),    h: "/docs/webhooks" },
          ]} />

          {/* Company */}
          <FootCol title={t("landing.footer.colCompany")} links={[
            { l: t("landing.footer.linkCareers"), h: "/careers" },
            { l: t("landing.footer.linkStatus"),  h: "/status" },
            { l: "GitHub", h: "https://github.com/UP2CLOUD/driftguard" },
          ]} />

          {/* Legal */}
          <FootCol title={t("landing.footer.colLegal")} links={[
            { l: t("landing.footer.linkPrivacy"), h: "/privacy" },
            { l: t("landing.footer.linkTerms"),   h: "/terms" },
            { l: t("landing.footer.linkDpa"),     h: "/dpa" },
            { l: t("landing.footer.linkSubproc"), h: "/subprocessors" },
          ]} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-[color:var(--dg-border)]">
        <div className="mx-auto flex max-w-[1400px] flex-col items-start justify-between gap-4 px-4 sm:px-6 py-5 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)] sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-3">
            <span>© 2026 UP2CLOUD</span>
            <span className="opacity-50">●</span>
            <span>{t("landing.footer.location")}</span>
            <span className="opacity-50">●</span>
            <span>{t("landing.footer.gdpr")}</span>
          </div>
          <div className="flex items-center gap-4">
            <LocaleSwitcher initialPreferences={preferences} compact label={t("common.language")} />
            <span className="opacity-50">●</span>
            <span>{t("footer.version")}</span>
            <span className="opacity-50">●</span>
            <span>commit {commitSha}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FootCol({ title, links }: { title: string; links: { l: string; h: string }[] }) {
  return (
    <div>
      <div className="dg-label">{title}</div>
      <ul className="mt-4 space-y-2.5 text-[13px]">
        {links.map((l) => (
          <li key={l.l}>
            <Link
              href={l.h}
              className="text-[color:var(--dg-fg-muted)] hover:text-[color:var(--dg-fg)] transition"
              {...(l.h.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
            >
              {l.l}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
