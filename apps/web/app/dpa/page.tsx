import { MarketingPageShell } from "@/components/MarketingPageShell";
import type { Metadata } from "next";
import { getMessages } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/translator";
import { getUserPreferences } from "@/lib/preferences/server";


export const metadata: Metadata = { title: "Data Processing Agreement — DriftGuard" };

const SECTIONS = [
  {
    title: "1. Definitions",
    body: `"Controller" means the customer entity that determines the purposes and means of processing personal data. "Processor" means UP2CLOUD Lda., operating DriftGuard. "Personal Data" has the meaning given in Article 4(1) GDPR. "Processing" has the meaning given in Article 4(2) GDPR.`,
  },
  {
    title: "2. Subject matter and duration",
    body: `This DPA governs the processing of Personal Data by DriftGuard on behalf of the Controller for the purpose of providing the DriftGuard Terraform PR review service. The DPA remains in effect for the duration of the service agreement and terminates automatically upon termination of that agreement.`,
  },
  {
    title: "3. Nature and purpose of processing",
    body: `DriftGuard processes: (a) GitHub repository metadata (repository name, PR number, commit SHA, author login); (b) Terraform plan output; (c) Infracost analysis output. Processing is performed solely to deliver the PR review service. DriftGuard does not process end-user personal data, payment card data, or health data.`,
  },
  {
    title: "4. Categories of data subjects",
    body: `Engineers and automated agents whose GitHub identities (username, email) appear in PR metadata submitted to DriftGuard for review.`,
  },
  {
    title: "5. Obligations of the Processor",
    body: `DriftGuard shall: (a) process Personal Data only on documented instructions from the Controller; (b) ensure that persons authorised to process Personal Data have committed to confidentiality; (c) implement appropriate technical and organisational measures per Article 32 GDPR; (d) not engage sub-processors without prior written consent of the Controller; (e) assist the Controller in responding to data subject rights requests; (f) delete or return all Personal Data upon termination of services.`,
  },
  {
    title: "6. Sub-processors",
    body: `Current sub-processors are listed at driftguard.io/subprocessors. DriftGuard will notify Controllers of any intended changes at least 30 days before the change takes effect.`,
  },
  {
    title: "7. Data transfers",
    body: `All Personal Data is stored in the European Economic Area (GCP EU-WEST-1, GCP EU-CENTRAL-1). No transfers to third countries occur without appropriate safeguards pursuant to Chapter V GDPR.`,
  },
  {
    title: "8. Security measures",
    body: `DriftGuard implements: AES-256 encryption at rest; TLS 1.3 in transit; access control limited to authorised personnel; regular security testing; incident response procedures with 72-hour breach notification to supervisory authority.`,
  },
  {
    title: "9. Audit rights",
    body: `The Controller may audit DriftGuard's compliance with this DPA once per year upon 30 days' written notice, or at any time following a confirmed security incident. Audits are conducted at the Controller's expense.`,
  },
  {
    title: "10. Governing law",
    body: `This DPA is governed by the laws of Portugal and the mandatory provisions of EU Regulation 2016/679 (GDPR).`,
  },
];

export default async function DPA() {
  const preferences = await getUserPreferences();
  const messages = await getMessages(preferences.locale);
  const t = createTranslator(messages);


  return (
    <MarketingPageShell
      eyebrow={t("dpa.eyebrow")} title={t("dpa.title")} subtitle={t("dpa.subtitle")}
      narrow
    >
      <div className="space-y-8">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="font-sans text-[15px] font-semibold text-[color:var(--dg-fg)] mb-2">{s.title}</h2>
            <p className="text-[13px] leading-relaxed text-[color:var(--dg-fg-muted)]">{s.body}</p>
          </div>
        ))}
        <div className="rounded-md border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-5 mt-10">
          <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
            To execute a signed DPA, contact{" "}
            <a href="mailto:legal@driftguard.io" className="text-[color:var(--dg-electric-bright)] hover:underline">legal@driftguard.io</a>.
            Enterprise customers receive a countersigned PDF within 2 business days.
          </p>
        </div>
      </div>
    </MarketingPageShell>
  );
}
