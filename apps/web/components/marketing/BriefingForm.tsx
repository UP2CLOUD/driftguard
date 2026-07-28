"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Reveal } from "./Reveal";

const ROLES = [
  "CISO / Security leader",
  "Platform / DevOps engineer",
  "Compliance / Risk / Audit",
  "Engineering leadership",
  "Other",
] as const;

const USE_CASES = [
  "Terraform / OpenTofu PR review",
  "Compliance evidence (DORA / NIS2 / ISO 27001)",
  "Cost governance",
  "Kubernetes / GitHub Actions review",
  "Other",
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

function validate(form: FormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = "Enter a valid work email.";
  if (!form.company.trim()) errors.company = "Enter your company name.";
  if (!form.role) errors.role = "Select a role.";
  if (!form.useCase) errors.useCase = "Select a primary use case.";
  if (!form.acknowledged) errors.acknowledged = "Acknowledge the privacy notice to continue.";
  return errors;
}

const FIELD_CLASS =
  "w-full min-h-[44px] rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2 text-[13px] text-[color:var(--dg-fg)] outline-none transition focus:border-[color:var(--dg-electric)] focus:ring-1 focus:ring-[color:var(--dg-electric)]";
const LABEL_CLASS = "mb-1.5 block font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]";
const ERROR_CLASS = "mt-1 text-[11px] text-[color:var(--dg-blocked)]";

export function BriefingForm() {
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
    const nextErrors = validate(form);
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
          ? "Too many requests — please wait a minute and try again."
          : "Something went wrong sending your request.",
      );
    } catch {
      setStatus("error");
      setServerError("Network error — check your connection and try again.");
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
        <h4 className="mb-2 text-[16px] font-medium text-white">Request received</h4>
        <p className="text-[13px] text-[color:var(--dg-fg-muted)]">
          Thanks, {form.name.split(" ")[0] || "there"} — someone from the team will follow up at {form.email}{" "}
          to schedule your technical briefing. No meeting is booked yet; this only confirms we received your
          request.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="rounded-lg border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] p-6">
      {/* Honeypot — hidden from sighted and keyboard users, visible to naive bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-0 w-0 overflow-hidden">
        <label htmlFor="briefing-website">Leave this field empty</label>
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
            Full name <span aria-hidden="true">*</span>
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
            Work email <span aria-hidden="true">*</span>
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
            Company <span aria-hidden="true">*</span>
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
            Role <span aria-hidden="true">*</span>
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
            <option value="">Select…</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
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
            Primary use case <span aria-hidden="true">*</span>
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
            <option value="">Select…</option>
            {USE_CASES.map((u) => (
              <option key={u} value={u}>
                {u}
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
            Anything else? <span className="normal-case tracking-normal text-[color:var(--dg-fg-subtle)]">(optional)</span>
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
            I understand DriftGuard will use this information to respond to my request, per the{" "}
            <Link href="/privacy" className="underline hover:text-white">
              privacy policy
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
        {status === "loading" ? "Submitting your request…" : ""}
        {status === "error" ? serverError : ""}
      </div>

      {status === "error" && serverError && (
        <p role="alert" className="mt-3 text-[12px] text-[color:var(--dg-blocked)]">
          {serverError} You can try again — nothing you entered was lost.
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        aria-busy={status === "loading"}
        className="touch-manipulation mt-5 min-h-[44px] w-full rounded bg-[color:var(--dg-electric)] px-6 py-3 font-mono text-[12px] uppercase tracking-widest text-white transition-colors hover:bg-[color:var(--dg-electric-bright)] active:scale-[0.98] disabled:opacity-60 sm:w-auto"
      >
        {status === "loading" ? "Sending…" : "Request a technical briefing"}
      </button>
    </form>
  );
}

export function BriefingSection() {
  return (
    <div id="briefing" className="w-full max-w-2xl mx-auto px-6 py-24">
      <Reveal className="mb-8 text-center">
        <h2 className="font-mono text-[11px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] mb-4">
          Talk to the team
        </h2>
        <h3 className="text-3xl font-medium text-white mb-4">Schedule a technical briefing</h3>
        <p className="text-[color:var(--dg-fg-muted)]">
          Tell us about your environment and someone from the team will follow up to walk through DriftGuard for
          your Terraform, Kubernetes, or GitHub Actions workflows.
        </p>
      </Reveal>
      <Reveal delay={0.06}>
        <BriefingForm />
      </Reveal>
    </div>
  );
}
