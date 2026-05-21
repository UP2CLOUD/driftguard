import { auth } from "@/auth";
import { signInWithGitHub } from "@/lib/auth-actions";
import Link from "next/link";

import { SignInButton } from "@/components/SignInButton";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { DriftPreview } from "@/components/landing/DriftPreview";
import { FeatureGrid } from "@/components/landing/FeatureGrid";
import { Architecture } from "@/components/landing/Architecture";
import { SemanticMemory } from "@/components/landing/SemanticMemory";
import { Metrics } from "@/components/landing/Metrics";
import { CodeIntegration } from "@/components/landing/CodeIntegration";
import { Pricing } from "@/components/landing/Pricing";
import { Footer } from "@/components/landing/Footer";

export default async function Page() {
  const session = await auth();
  const isLoggedIn = !!session;

  return (
    <main className="relative min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)] overflow-x-hidden">
      <StatusBar />
      <MarketingNav
        isLoggedIn={isLoggedIn}
        cta={
          <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
            Get started
          </SignInButton>
        }
      />

      <Hero
        ctaPrimary={
          isLoggedIn ? (
            <Link href="/dashboard" className="dg-button dg-button-primary">
              Open dashboard
              <span aria-hidden>→</span>
            </Link>
          ) : (
            <form action={signInWithGitHub}>
              <button type="submit" className="dg-button dg-button-primary">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 .2a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 008 .2z"/>
                </svg>
                Start with GitHub
              </button>
            </form>
          )
        }
        ctaSecondary={
          <Link href="#architecture" className="dg-button dg-button-ghost">
            Read the architecture
          </Link>
        }
      />

      <TrustBar />
      <DriftPreview />
      <FeatureGrid />
      <Architecture />
      <SemanticMemory />
      <Metrics />
      <CodeIntegration />
      <Pricing />

      {/* Final CTA */}
      <section id="waitlist" className="relative overflow-hidden border-b border-[color:var(--dg-border)] dg-grid">
        <div className="absolute inset-0 dg-vignette" />
        <div className="relative mx-auto max-w-[1400px] px-4 sm:px-6 py-20 sm:py-24 text-center">
          <div className="dg-label mb-4">Ship safer infra</div>
          <h2 className="font-sans text-3xl sm:text-4xl md:text-5xl font-semibold leading-[1.05] tracking-[-0.02em] text-[color:var(--dg-fg)]">
            Your Terraform PRs deserve a real review.
            <br />
            <span className="bg-gradient-to-r from-[color:var(--dg-electric)] to-[color:var(--dg-cyan)] bg-clip-text text-transparent">
              Cost, drift, security, compliance — in 30 seconds.
            </span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[14px] sm:text-[15px] text-[color:var(--dg-fg-muted)]">
            Early access opens to 50 platform teams in 2026. First 20 get lifetime 50% off.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {isLoggedIn ? (
              <Link href="/dashboard" className="dg-button dg-button-primary">
                Open dashboard →
              </Link>
            ) : (
              <form action={signInWithGitHub}>
                <button type="submit" className="dg-button dg-button-primary">
                  Get early access →
                </button>
              </form>
            )}
            <a href="mailto:sales@driftguard.io" className="dg-button dg-button-ghost">
              Talk to sales
            </a>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6 font-mono text-[10px] uppercase tracking-widest text-[color:var(--dg-fg-subtle)]">
            <span>● EU‑hosted</span>
            <span>● Self‑host available</span>
            <span>● SOC 2 in progress</span>
            <span>● DORA / NIS2 / ISO 27001</span>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
