export type LegalSection = {
  id: string;
  title: string;
  paragraphs: string[];
  list?: string[];
};

export type LegalDocumentContent = {
  label: string;
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  intro: string;
  sections: LegalSection[];
};

const EFFECTIVE = "2026-05-17";
const OPERATOR =
  "UP2CLOUD Unipessoal Lda. (“UP2CLOUD”, “we”, “us”, or “our”), the operator of the DriftGuard platform (“DriftGuard”, “Service”).";
const CONTACT_PRIVACY = "privacy@driftguard.io";
const CONTACT_LEGAL = "legal@driftguard.io";

export const privacyPolicy: LegalDocumentContent = {
  label: "Legal",
  title: "Privacy Policy",
  effectiveDate: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: `This Privacy Policy describes how ${OPERATOR} collects, uses, stores, and protects personal data when you visit our websites, create an account, connect GitHub or cloud integrations, or otherwise use DriftGuard. DriftGuard is a B2B DevSecOps and FinOps platform that analyzes infrastructure-as-code pull requests for cost, drift, security, and compliance signals. We process data primarily as a processor on behalf of your organization and as a controller for account, billing, and product-improvement data described below.`,
  sections: [
    {
      id: "scope",
      title: "1. Scope and roles",
      paragraphs: [
        "This policy applies to driftguard.io, app.driftguard.io, and related subdomains, APIs, and support channels. If your organization subscribes to DriftGuard under a Data Processing Agreement (DPA), that agreement governs Customer Content (for example, repository metadata, plan output, and findings) and may supplement this policy.",
        "Where we process personal data on your organization’s instructions, you are the data controller and UP2CLOUD acts as processor. For account registration, marketing, billing, and security logging, UP2CLOUD is an independent controller.",
      ],
    },
    {
      id: "collection",
      title: "2. Information we collect",
      paragraphs: ["We collect the following categories of information:"],
      list: [
        "Account and identity: name, work email, organization name, authentication identifiers from GitHub OAuth or SSO, and role assignments you configure.",
        "Integration data: repository names, pull request identifiers, commit SHAs, OpenTofu/Terraform plan artifacts, cloud resource metadata required to compute cost, drift, and security findings, and webhook delivery logs.",
        "Usage and diagnostics: feature usage events, API request metadata, performance metrics, error reports, and support correspondence.",
        "Billing: subscription tier, invoice contacts, payment status (payment card data is handled by our payment processor, not stored by us).",
        "Marketing: waitlist email addresses and campaign attribution when you opt in on our website.",
        "Technical: IP address, browser type, device identifiers, and cookies described in Section 8.",
      ],
    },
    {
      id: "usage",
      title: "3. How we use information",
      paragraphs: ["We use personal data to:"],
      list: [
        "Provide, maintain, and improve the Service, including PR analysis, dashboards, notifications, and policy enforcement.",
        "Authenticate users, prevent fraud and abuse, and enforce acceptable use.",
        "Operate billing, account management, and customer support.",
        "Send product, security, and legal notices; marketing communications only with consent or applicable B2B soft-opt-in rules.",
        "Comply with law, respond to lawful requests, and protect rights, safety, and security.",
        "Generate aggregated, de-identified analytics to improve detection quality and platform reliability.",
      ],
    },
    {
      id: "legal-basis",
      title: "4. Legal basis (EEA/UK)",
      paragraphs: [
        "Where GDPR applies, we rely on: (a) contract performance for providing the Service; (b) legitimate interests for security, product improvement, and B2B marketing to business contacts; (c) consent for non-essential cookies and optional communications; and (d) legal obligation where required. You may object to certain processing where applicable law provides that right.",
      ],
    },
    {
      id: "sharing",
      title: "5. Sharing and subprocessors",
      paragraphs: [
        "We do not sell personal data. We share data with infrastructure and subprocessors that help us operate the Service (for example, EU-region cloud hosting, observability, email delivery, and payment processing), bound by confidentiality and data protection terms. A current subprocessor list is available on request at " +
          CONTACT_PRIVACY +
          ".",
        "We may disclose information if required by law, in connection with a merger or acquisition, or to protect DriftGuard, our customers, or the public from harm or illegal activity.",
      ],
    },
    {
      id: "transfers",
      title: "6. International transfers",
      paragraphs: [
        "DriftGuard is designed for EU hosting by default. If data is transferred outside the European Economic Area or UK, we implement appropriate safeguards such as Standard Contractual Clauses and transfer impact assessments where required.",
      ],
    },
    {
      id: "retention",
      title: "7. Data retention",
      paragraphs: [
        "We retain Customer Content according to your organization’s plan settings and DPA, typically for the duration of the subscription plus a limited backup period. Account and billing records are retained as required for tax, accounting, and legal obligations. Security logs may be retained for up to twenty-four (24) months unless a longer period is required for incident investigation.",
      ],
    },
    {
      id: "security",
      title: "8. Security",
      paragraphs: [
        "We implement administrative, technical, and organizational measures appropriate to a B2B infrastructure security product, including encryption in transit, access controls, least-privilege engineering practices, vulnerability management, and audit logging. No method of transmission or storage is completely secure; you are responsible for securing credentials, GitHub tokens, and cloud roles you provision to DriftGuard.",
      ],
    },
    {
      id: "cookies",
      title: "9. Cookies and similar technologies",
      paragraphs: [
        "We use strictly necessary cookies for authentication and session management. With your consent where required, we may use analytics cookies to understand product usage. You can control non-essential cookies through your browser settings or in-product preferences when available.",
      ],
    },
    {
      id: "rights",
      title: "10. Your rights",
      paragraphs: [
        "Depending on your location, you may have rights to access, rectify, erase, restrict, port, or object to processing of your personal data, and to withdraw consent. EEA/UK residents may lodge a complaint with a supervisory authority. Requests should be sent to " +
          CONTACT_PRIVACY +
          "; we may need to verify your identity and coordinate with your organization’s administrator for processor-held data.",
      ],
    },
    {
      id: "children",
      title: "11. Children",
      paragraphs: [
        "DriftGuard is a business service not directed to individuals under 16. We do not knowingly collect personal data from children.",
      ],
    },
    {
      id: "changes",
      title: "12. Changes to this policy",
      paragraphs: [
        "We may update this Privacy Policy to reflect product, legal, or regulatory changes. Material changes will be notified via the Service or email where appropriate. Continued use after the effective date constitutes acceptance of the updated policy.",
      ],
    },
    {
      id: "contact",
      title: "13. Contact",
      paragraphs: [
        "UP2CLOUD Unipessoal Lda., DriftGuard Privacy, " +
          CONTACT_PRIVACY +
          ". For data protection inquiries in the EU, include your organization name and the nature of your request.",
      ],
    },
  ],
};

export const termsOfService: LegalDocumentContent = {
  label: "Legal",
  title: "Terms of Service",
  effectiveDate: EFFECTIVE,
  lastUpdated: EFFECTIVE,
  intro: `These Terms of Service (“Terms”) govern access to and use of DriftGuard, operated by ${OPERATOR}. By creating an account, connecting a repository, or using the Service, you agree to these Terms on behalf of yourself and the organization you represent. If you do not agree, do not use the Service.`,
  sections: [
    {
      id: "service",
      title: "1. The Service",
      paragraphs: [
        "DriftGuard provides automated analysis of OpenTofu and Terraform pull requests, including cost estimates, drift detection, security findings, compliance mapping, and related integrations. Features vary by subscription tier. We may modify features with reasonable notice for material reductions in paid capabilities.",
      ],
    },
    {
      id: "eligibility",
      title: "2. Eligibility and accounts",
      paragraphs: [
        "The Service is intended for businesses and professional users. You must be at least 18 years old and authorized to bind your organization. You are responsible for maintaining accurate account information, safeguarding credentials, and all activity under your account. Notify us promptly at " +
          CONTACT_LEGAL +
          " of unauthorized use.",
      ],
    },
    {
      id: "acceptable-use",
      title: "3. Acceptable use",
      paragraphs: ["You agree not to:"],
      list: [
        "Use the Service in violation of applicable law, export controls, or third-party terms (including GitHub and cloud provider policies).",
        "Probe, scan, or test vulnerabilities without written authorization, or interfere with Service integrity or performance.",
        "Upload malware, unlawful content, or data you lack rights to process.",
        "Reverse engineer the Service except where permitted by mandatory law.",
        "Resell, sublicense, or provide the Service to third parties except as expressly permitted in an enterprise agreement.",
        "Use findings to attack systems you do not own or lack explicit authorization to test.",
      ],
    },
    {
      id: "customer-data",
      title: "4. Customer data and intellectual property",
      paragraphs: [
        "You retain ownership of your repositories, infrastructure code, and cloud configuration data (“Customer Data”). You grant UP2CLOUD a limited license to host, process, and display Customer Data solely to provide and improve the Service as permitted by your plan and DPA.",
        "DriftGuard software, models, rulesets, documentation, and branding are owned by UP2CLOUD or its licensors. Feedback you provide may be used without restriction to improve the product.",
      ],
    },
    {
      id: "third-party",
      title: "5. Third-party services",
      paragraphs: [
        "The Service integrates with third parties such as GitHub, GitLab, cloud providers, and notification tools. Your use of those services is governed by their terms. We are not responsible for third-party outages, API changes, or data handling outside our control.",
      ],
    },
    {
      id: "billing",
      title: "6. Subscriptions and billing",
      paragraphs: [
        "Paid plans are billed per repository or as specified in your order form. Fees are exclusive of taxes unless stated otherwise. Subscriptions renew automatically until cancelled in accordance with your plan. Refunds are provided only where required by law or explicitly stated in writing.",
      ],
    },
    {
      id: "confidentiality",
      title: "7. Confidentiality",
      paragraphs: [
        "Each party may receive confidential information from the other. The receiving party will use reasonable care to protect such information and use it only for the purpose of the relationship. Confidentiality obligations do not apply to information that is public, independently developed, or rightfully received without restriction.",
      ],
    },
    {
      id: "warranties",
      title: "8. Disclaimers",
      paragraphs: [
        "THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, UP2CLOUD DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. ANALYSIS OUTPUT (INCLUDING COST ESTIMATES, DRIFT SIGNALS, AND SECURITY FINDINGS) IS INFORMATIONAL AND DOES NOT REPLACE PROFESSIONAL SECURITY, FINANCIAL, OR COMPLIANCE ADVICE. YOU REMAIN RESPONSIBLE FOR CHANGES YOU MERGE TO PRODUCTION.",
      ],
    },
    {
      id: "liability",
      title: "9. Limitation of liability",
      paragraphs: [
        "TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY WILL BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL. EXCEPT FOR EXCLUDED MATTERS (SUCH AS PAYMENT OBLIGATIONS, CONFIDENTIALITY BREACHES, OR INDEMNIFICATION), EACH PARTY’S AGGREGATE LIABILITY ARISING FROM THESE TERMS WILL NOT EXCEED THE GREATER OF (A) AMOUNTS PAID BY YOU TO UP2CLOUD IN THE TWELVE (12) MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED EUROS (€100). SOME JURISDICTIONS DO NOT ALLOW CERTAIN LIMITATIONS; IN THOSE CASES, LIABILITY IS LIMITED TO THE FULLEST EXTENT PERMITTED.",
      ],
    },
    {
      id: "indemnity",
      title: "10. Indemnification",
      paragraphs: [
        "You will defend and indemnify UP2CLOUD against third-party claims arising from your Customer Data, your use of the Service in breach of these Terms, or your violation of law or third-party rights, except to the extent caused by our gross negligence or willful misconduct.",
      ],
    },
    {
      id: "termination",
      title: "11. Termination",
      paragraphs: [
        "Either party may terminate for material breach not cured within thirty (30) days of notice. We may suspend access immediately for security risk or abuse. Upon termination, your right to use the Service ends; we will delete or return Customer Data per the DPA and retention schedule. Sections that by nature should survive (including liability, confidentiality, and governing law) survive termination.",
      ],
    },
    {
      id: "governing-law",
      title: "12. Governing law and disputes",
      paragraphs: [
        "These Terms are governed by the laws of Portugal, excluding conflict-of-law rules. Courts in Lisbon, Portugal have exclusive jurisdiction, without prejudice to mandatory consumer protections that cannot be waived. The UN Convention on Contracts for the International Sale of Goods does not apply.",
      ],
    },
    {
      id: "changes-terms",
      title: "13. Changes",
      paragraphs: [
        "We may update these Terms. We will post the revised Terms and update the effective date. Material changes to paid customers will be notified with at least thirty (30) days’ notice when practicable. Continued use after the effective date constitutes acceptance.",
      ],
    },
    {
      id: "contact-terms",
      title: "14. Contact",
      paragraphs: [
        "Questions about these Terms: UP2CLOUD Unipessoal Lda., DriftGuard Legal, " + CONTACT_LEGAL + ".",
      ],
    },
  ],
};


export async function getLegalContent(locale: string): Promise<{
  privacy: LegalDocumentContent;
  terms: LegalDocumentContent;
}> {
  if (locale === "pt-BR") {
    const { privacyPolicyPtBR, termsOfServicePtBR } = await import("./legal-content.pt-BR");
    return { privacy: privacyPolicyPtBR, terms: termsOfServicePtBR };
  }
  return { privacy: privacyPolicy, terms: termsOfService };
}
