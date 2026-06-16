"use client";

import { Fragment, useEffect, useState } from "react";
import { useT } from "@/components/TranslationProvider";
import { LiveTerminal } from "./LiveTerminal";
import Link from "next/link";

function useTypewriter(lines: string[], { speed = 48, pause = 380 } = {}) {
  const [displayed, setDisplayed] = useState<[string, string]>(["", ""]);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayed([lines[0] ?? "", lines[1] ?? ""]);
      setDone(true);
      return;
    }
    setDisplayed(["", ""]);
    setDone(false);
    const [line1, line2] = lines;
    let cancelled = false;
    const delay = (ms: number) => new Promise<void>((r) => {
      const id = setTimeout(r, ms);
      (delay as any)._last = id;
    });
    async function animate() {
      for (let i = 1; i <= line1.length; i++) {
        if (cancelled) return;
        setDisplayed([line1.slice(0, i), ""]);
        await delay(speed);
      }
      if (cancelled) return;
      await delay(pause);
      if (cancelled) return;
      for (let i = 1; i <= line2.length; i++) {
        if (cancelled) return;
        setDisplayed([line1, line2.slice(0, i)]);
        await delay(speed);
      }
      if (!cancelled) setDone(true);
    }
    animate();
    return () => {
      cancelled = true;
      clearTimeout((delay as any)._last);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines[0], lines[1]]);

  return { displayed, done };
}

function Cursor({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <span
      aria-hidden="true"
      className="inline-block w-[2px] h-[0.85em] bg-[color:var(--dg-electric)]
        align-middle ml-[2px] relative top-[-1px]
        animate-[dg-cursor_1s_step-end_infinite]"
    />
  );
}

function interpolateReact(
  template: string,
  replacements: Record<string, React.ReactNode>,
): React.ReactNode {
  const parts = template.split(/\{(\w+)\}/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Fragment key={i}>{replacements[part] ?? `{${part}}`}</Fragment>
      : part,
  );
}

export function Hero({
  ctaPrimary,
  ctaSecondary,
}: {
  ctaPrimary: React.ReactNode;
  ctaSecondary?: React.ReactNode;
}) {
  const t = useT();
  const line1 = t("landing.hero.line1");
  const line2 = t("landing.hero.line2");
  const { displayed, done } = useTypewriter([line1, line2], { speed: 44, pause: 340 });

  return (
    <section className="relative overflow-hidden border-b border-[color:var(--dg-border)] dg-grid dg-vignette">
      <div className="dg-grain absolute inset-0 pointer-events-none" />
      <div className="pointer-events-none absolute -top-32 left-1/2 h-[600px] w-[900px] -translate-x-1/2
        bg-[radial-gradient(closest-side,rgba(63,140,255,0.08),transparent_70%)]" />

      <div className="relative mx-auto grid max-w-[1400px] gap-10 px-4 sm:px-6 py-14 sm:py-20
        lg:grid-cols-[1fr_1.15fr] lg:gap-16 lg:py-28">

        <div className="relative flex flex-col justify-center min-w-0 w-full">
          {/* Badge */}
          <div className="mb-6 inline-flex w-fit max-w-full items-center gap-2.5 rounded-full
            border border-[color:var(--dg-electric)]/20 bg-[color:var(--dg-electric)]/10 px-3.5 py-1.5">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[color:var(--dg-electric)] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[color:var(--dg-electric-bright)]" />
            </span>
            <span className="font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-electric-bright)] truncate">
              {t("hero.badge")}
            </span>
          </div>

          {/* Headline with typewriter */}
          <h1
            className="font-sans font-semibold leading-[1.15] tracking-[-0.02em]
              text-[28px] sm:text-[38px] md:text-[46px] lg:text-[54px]"
            aria-label={`${line1} ${line2}`}
          >
            <span className="block relative" aria-hidden="true">
              <span className="invisible whitespace-pre-wrap break-words" aria-hidden="true">{line1}</span>
              <span className="absolute inset-0 text-[color:var(--dg-fg)] whitespace-pre-wrap break-words">
                {displayed[0]}
                {!done && displayed[1] === "" && <Cursor visible={true} />}
              </span>
            </span>
            <span className="block relative" aria-hidden="true">
              <span className="invisible whitespace-pre-wrap break-words
                bg-gradient-to-r from-[color:var(--dg-electric)] via-[color:var(--dg-electric-bright)]
                to-[color:var(--dg-cyan)] bg-clip-text text-transparent" aria-hidden="true">
                {line2}
              </span>
              <span className="absolute inset-0 whitespace-pre-wrap break-words
                bg-gradient-to-r from-[color:var(--dg-electric)] via-[color:var(--dg-electric-bright)]
                to-[color:var(--dg-cyan)] bg-clip-text text-transparent">
                {displayed[1]}
                <Cursor visible={!done && displayed[1].length > 0} />
              </span>
            </span>
          </h1>

          {/* Sub */}
          <p className="mt-5 text-[13px] sm:text-[15px] leading-relaxed text-[color:var(--dg-fg-muted)]">
            {interpolateReact(t("hero.subText"), {
              cost: <span className="text-[color:var(--dg-fg)]">{t("hero.costSurprises")}</span>,
              drift: <span className="text-[color:var(--dg-fg)]">{t("hero.drift")}</span>,
              security: <span className="text-[color:var(--dg-fg)]">{t("hero.securityMisconfigs")}</span>,
              compliance: <span className="text-[color:var(--dg-fg)]">{t("hero.complianceGaps")}</span>,
            })}
          </p>

          {/* Config snippet */}
          <div className="mt-6 hidden xs:flex sm:flex items-center gap-2 rounded-lg border
            border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)] px-3 py-2.5
            w-fit max-w-full overflow-hidden">
            <code className="font-sans font-medium text-[10px] sm:text-[11px] text-[color:var(--dg-fg-muted)] truncate min-w-0 block">
              <span className="text-[color:var(--dg-electric-bright)]">{t("hero.configLabel")}</span>
              <span className="mx-2 opacity-30">|</span>
              <span className="text-allowed">{t("hero.configBlock")}</span>
              <span className="ml-1 text-[color:var(--dg-fg-muted)]">{t("hero.configResource")}</span>
            </code>
          </div>

          {/* CTAs */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {ctaPrimary}
            {ctaSecondary}
            <Link
              href="/#architecture"
              className="font-sans font-semibold text-[11px] uppercase tracking-wide text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
            >
              {t("nav.howItWorks")}
            </Link>
          </div>

          {/* Stats strip */}
          <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-6 border-t border-[color:var(--dg-border)] pt-6">
            <Stat label={t("hero.statP99")} value="&lt;2s" sub="review time" />
            <Stat label={t("hero.statMemory")} value="384‑d" sub={t("hero.statMemorySub")} />
            <Stat label={t("hero.statCompliance")} value="DORA" sub={t("hero.statComplianceSub")} />
          </div>
        </div>

        {/* Right: live terminal */}
        <div className="relative hidden lg:flex items-center">
          <div className="w-full">
            <LiveTerminal />
            <div className="mt-3 flex items-center justify-between font-sans font-medium text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
              <span>{t("hero.terminalLabel")}</span>
              <span>{t("hero.terminalRefresh")}</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="dg-label truncate">{label}</div>
      <div
        className="mt-1 font-mono text-[18px] sm:text-xl font-semibold tabular-nums text-[color:var(--dg-fg)] leading-tight"
        dangerouslySetInnerHTML={{ __html: value }}
      />
      <div className="mt-0.5 text-[9px] sm:text-[10px] text-[color:var(--dg-fg-subtle)] font-mono truncate">{sub}</div>
    </div>
  );
}
