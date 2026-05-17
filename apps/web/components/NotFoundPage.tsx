"use client";

import { DriftguardLogo } from "@/components/DriftguardLogo";
import { useT } from "@/components/I18nProvider";
import Link from "next/link";
import type { ReactNode } from "react";

type NotFoundPageProps = {
  hasSession: boolean;
};

export function NotFoundPage({ hasSession }: NotFoundPageProps) {
  const t = useT();

  return (
    <main className="relative flex min-h-screen flex-col bg-canvas text-fg">
      <div className="pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(color-mix(in srgb, var(--dg-border) 40%, transparent) 1px, transparent 1px),
              linear-gradient(90deg, color-mix(in srgb, var(--dg-border) 40%, transparent) 1px, transparent 1px)
            `,
            backgroundSize: "48px 48px",
          }}
        />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      </div>

      <header className="relative z-10 border-b border-border bg-canvas/95 backdrop-blur-md">
        <Animate animation="fade-in" className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <DriftguardLogo href="/" />
          <Link
            href="/"
            className="font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:text-accent"
          >
            {t("notFound.backHome")}
          </Link>
        </Animate>
      </header>

      <div className="relative z-10 flex flex-1 items-center justify-center px-4 py-16">
        <Animate animation="fade-up" delay="80ms" className="w-full max-w-lg">
          <article className="dg-panel overflow-hidden p-8 md:p-10">
            <div className="mb-6 flex items-center gap-2 font-mono text-2xs uppercase tracking-wider text-fg-subtle">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-signal-drift" aria-hidden />
              <span>{t("notFound.statusLabel")}</span>
              <span className="text-signal-drift">{t("notFound.statusValue")}</span>
            </div>

            <h1 className="tracking-tight text-fg">
              <span className="block font-mono text-6xl font-bold tabular-nums text-accent md:text-7xl">
                {t("notFound.code")}
              </span>
              <span className="mt-2 block text-xl font-semibold md:text-2xl">{t("notFound.title")}</span>
            </h1>

            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{t("notFound.description")}</p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-md bg-accent px-4 py-2 text-sm font-semibold text-canvas transition duration-150 ease-out hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
              >
                {t("notFound.backHome")}
              </Link>
              {hasSession ? (
                <Link
                  href="/dashboard"
                  className="inline-flex items-center justify-center rounded-md border border-border bg-surface px-4 py-2 text-sm font-semibold text-fg-muted transition duration-150 ease-out hover:border-border-strong hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  {t("notFound.goDashboard")}
                </Link>
              ) : null}
            </div>
          </article>
        </Animate>
      </div>
    </main>
  );
}

function Animate({
  children,
  className = "",
  animation,
  delay = "0ms",
}: {
  children: ReactNode;
  className?: string;
  animation: "fade-in" | "fade-up";
  delay?: string;
}) {
  const animClass = animation === "fade-in" ? "animate-fade-in" : "animate-fade-up";
  return (
    <div className={`${animClass} opacity-0 ${className}`} style={{ animationDelay: delay }}>
      {children}
    </div>
  );
}
