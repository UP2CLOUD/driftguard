"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "./Reveal";
import { useT } from "@/components/TranslationProvider";

// The submitted `value` stays a stable English string (sent to /api/briefing
// and stored downstream) regardless of locale — only the displayed label
// is translated.
const ROLES = [
  { value: "CISO / Security leader", labelKey: "marketing.briefing.role1" },
  { value: "Platform / DevOps engineer", labelKey: "marketing.briefing.role2" },
  { value: "Compliance / Risk / Audit", labelKey: "marketing.briefing.role3" },
  { value: "Engineering leadership", labelKey: "marketing.briefing.role4" },
  { value: "Other", labelKey: "marketing.briefing.roleOther" },
] as const;

const USE_CASES = [
  { value: "Terraform / OpenTofu PR review", labelKey: "marketing.briefing.useCase1" },
  { value: "Compliance evidence (DORA / NIS2 / ISO 27001)", labelKey: "marketing.briefing.useCase2" },
  { value: "Cost governance", labelKey: "marketing.briefing.useCase3" },
  { value: "Kubernetes / GitHub Actions review", labelKey: "marketing.briefing.useCase4" },
  { value: "Other", labelKey: "marketing.briefing.useCaseOther" },
] as const;

type Status = "idle" | "loading" | "success" | "error";

interface FormState {
  name: string;
  email: string;
  company: string;
  role: string;
  useCase: string;
  context: string;
  acknowledged: boolean;
  website: string; // honeypot
}

const INITIAL: FormState = {
  name: "",
  email: "",
  company: "",
  role: "",
  useCase: "",
  context: "",
  acknowledged: false,
  website: "",
};

function validate(form: FormState, t: ReturnType<typeof useT>): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = t("marketing.briefing.errorName");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = t("marketing.briefing.errorEmail");
  if (!form.company.trim()) errors.company = t("marketing.briefing.errorCompany");
  if (!form.role) errors.role = t("marketing.briefing.errorRole");
  if (!form.useCase) errors.useCase = t("marketing.briefing.errorUseCase");
  if (!form.acknowledged) errors.acknowledged = t("marketing.briefing.errorAck");
  return errors;
}

const FIELD_CLASS =
  "w-full min-h-[44px] rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2 text-[13px] text-[color:var(--dg-fg)] outline-none transition focus:border-[color:var(--dg-electric)] focus:ring-1 focus:ring-[color:var(--dg-electric)]";
const LABEL_CLASS = "mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]";
const ERROR_CLASS = "mt-1 text-[11px] text-[color:var(--dg-blocked)]";

export function BriefingForm() {
  const t = useT();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [serverError, setServerError] = useState<string | null>(null);

  const fieldRefs = useRef<Record<string, HTMLElement | null>>({});
  const successRef = useRef<HTMLDivElement | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors = validate(form, t);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstKey = Object.keys(nextErrors)[0];
      fieldRefs.current[firstKey]?.focus();
      return;
    }

    setStatus("loading");
    setServerError(null);
    try {
      const r = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (r.ok) {
        setStatus("success");
        // Move focus to the confirmation so screen-reader users land on it
        // immediately instead of on now-removed form controls.
        requestAnimationFrame(() => successRef.current?.focus());
        return;
      }
      const data = await r.json().catch(() => null);
      if (r.status === 400 && data?.fields) {
        setErrors(data.fields);
        const firstKey = Object.keys(data.fields)[0];
        fieldRefs.current[firstKey]?.focus();
        setStatus("idle");
        return;
      }
      setStatus("error");
      setServerError(
        r.status === 429
          ? t("marketing.briefing.errorTooMany")
          : t("marketing.briefing.errorGeneric"),
      );
    } catch {
      setStatus("error");
      setServerError(t("marketing.briefing.errorNetwork"));
    }
  }

  if (status === "success") {
    return (
      <div
        ref={successRef}
        tabIndex={-1}
        role="status"
        className="rounded-lg border border-[color:var(--dg-allowed)] bg-[color-mix(in_srgb,var(--dg-allowed)_8%,transparent)] p-6 text-center outline-none"
      >
        <h4 className="mb-2 text-[16px] font-medium text-white">{t("marketing.briefing.successTitle")}</h4>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
          {t("marketing.briefing.successBody", {
            name: form.name.split(" ")[0] || "there",
            email: form.email,
          })}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6">
      {/* Honeypot — hidden from sighted and keyboard users, visible to naive bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="briefing-website">{t("marketing.briefing.honeypotLabel")}</label>
        <input
          id="briefing-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={form.website}
          onChange={(e) => set("website", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="briefing-name" className={LABEL_CLASS}>
            {t("marketing.briefing.labelName")} <span aria-hidden="true">*</span>
          </label>
          <input
            id="briefing-name"
            ref={(el) => {
              fieldRefs.current.name = el;
            }}
            type="text"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? "briefing-name-error" : undefined}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={FIELD_CLASS}
          />
          {errors.name && (
            <p id="briefing-name-error" className={ERROR_CLASS}>
              {errors.name}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="briefing-email" className={LABEL_CLASS}>
            {t("marketing.briefing.labelEmail")} <span aria-hidden="true">*</span>
          </label>
          <input
            id="briefing-email"
            ref={(el) => {
              fieldRefs.current.email = el;
            }}
            type="email"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "briefing-email-error" : undefined}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={FIELD_CLASS}
          />
          {errors.email && (
            <p id="briefing-email-error" className={ERROR_CLASS}>
              {errors.email}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="briefing-company" className={LABEL_CLASS}>
            {t("marketing.briefing.labelCompany")} <span aria-hidden="true">*</span>
          </label>
          <input
            id="briefing-company"
            ref={(el) => {
              fieldRefs.current.company = el;
            }}
            type="text"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.company)}
            aria-describedby={errors.company ? "briefing-company-error" : undefined}
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
            className={FIELD_CLASS}
          />
          {errors.company && (
            <p id="briefing-company-error" className={ERROR_CLASS}>
              {errors.company}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="briefing-role" className={LABEL_CLASS}>
            {t("marketing.briefing.labelRole")} <span aria-hidden="true">*</span>
          </label>
          <select
            id="briefing-role"
            ref={(el) => {
              fieldRefs.current.role = el;
            }}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.role)}
            aria-describedby={errors.role ? "briefing-role-error" : undefined}
            value={form.role}
            onChange={(e) => set("role", e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t("marketing.briefing.selectPlaceholder")}</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {t(r.labelKey)}
              </option>
            ))}
          </select>
          {errors.role && (
            <p id="briefing-role-error" className={ERROR_CLASS}>
              {errors.role}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="briefing-use-case" className={LABEL_CLASS}>
            {t("marketing.briefing.labelUseCase")} <span aria-hidden="true">*</span>
          </label>
          <select
            id="briefing-use-case"
            ref={(el) => {
              fieldRefs.current.useCase = el;
            }}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.useCase)}
            aria-describedby={errors.useCase ? "briefing-use-case-error" : undefined}
            value={form.useCase}
            onChange={(e) => set("useCase", e.target.value)}
            className={FIELD_CLASS}
          >
            <option value="">{t("marketing.briefing.selectPlaceholder")}</option>
            {USE_CASES.map((u) => (
              <option key={u.value} value={u.value}>
                {t(u.labelKey)}
              </option>
            ))}
          </select>
          {errors.useCase && (
            <p id="briefing-use-case-error" className={ERROR_CLASS}>
              {errors.useCase}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="briefing-context" className={LABEL_CLASS}>
            {t("marketing.briefing.labelContext")} <span className="normal-case tracking-normal text-[color:var(--dg-fg-subtle)]">{t("marketing.briefing.optionalTag")}</span>
          </label>
          <textarea
            id="briefing-context"
            rows={3}
            maxLength={2000}
            value={form.context}
            onChange={(e) => set("context", e.target.value)}
            className={FIELD_CLASS}
          />
        </div>
      </div>

      <div className="mt-4">
        <label className="flex cursor-pointer items-start gap-2 text-[12px] text-[color:var(--dg-fg-muted)]">
          <input
            ref={(el) => {
              fieldRefs.current.acknowledged = el;
            }}
            type="checkbox"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.acknowledged)}
            aria-describedby={errors.acknowledged ? "briefing-ack-error" : undefined}
            checked={form.acknowledged}
            onChange={(e) => set("acknowledged", e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[color:var(--dg-electric)]"
          />
          <span>
            {t("marketing.briefing.ackBefore")}{" "}
            <Link href="/privacy" className="underline hover:text-white">
              {t("marketing.briefing.ackLinkText")}
            </Link>
            . <span aria-hidden="true">*</span>
          </span>
        </label>
        {errors.acknowledged && (
          <p id="briefing-ack-error" className={ERROR_CLASS}>
            {errors.acknowledged}
          </p>
        )}
      </div>

      <div aria-live="polite" className="sr-only">
        {status === "loading" ? t("marketing.briefing.ariaSubmitting") : ""}
        {status === "error" ? serverError : ""}
      </div>

      {status === "error" && serverError && (
        <p role="alert" className="mt-3 text-[12px] text-[color:var(--dg-blocked)]">
          {serverError} {t("marketing.briefing.errorRetryHint")}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        className="touch-manipulation mt-5 min-h-[44px] w-full rounded bg-[color:var(--dg-electric)] px-6 py-3 font-mono text-[12px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.98] disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? t("marketing.briefing.submitting") : t("marketing.briefing.submitCta")}
      </button>
    </form>
  );
}

export function BriefingSection() {
  const t = useT();
  return (
    <div id="briefing" className="w-full max-w-2xl mx-auto px-6 py-24">
      <Reveal className="mb-8 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          {t("marketing.briefing.eyebrow")}
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">{t("marketing.briefing.title")}</h3>
        <p className="text-[color:var(--dg-fg-muted)]">
          {t("marketing.briefing.subtitle")}
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <BriefingForm />
      </Reveal>
    </div>
  );
}
