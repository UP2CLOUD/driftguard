import { auth } from "@/auth";
import { SignInButton } from "@/components/SignInButton";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Footer } from "@/components/landing/Footer";
import { Pricing } from "@/components/landing/Pricing";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing — DriftGuard",
  description:
    "DriftGuard pricing: Free OSS, Team €29/repo/mo, Enterprise custom. Start for free, no credit card required.",
};

export default async function PricingPage() {
  const session = await auth();
  return (
    <>
      <StatusBar />
      <MarketingNav
        isLoggedIn={!!session}
        cta={
          !session ? (
            <SignInButton className="dg-button dg-button-primary text-[12px] sm:text-[13px]">
              Get started
            </SignInButton>
          ) : undefined
        }
      />
      <main className="bg-[color:var(--dg-canvas)]">
        <Pricing />
      </main>
      <Footer />
    </>
  );
}
