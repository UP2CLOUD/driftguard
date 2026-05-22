import { auth } from "@/auth";
import { JsonLd } from "@/components/JsonLd";
import { StatusBar } from "@/components/landing/StatusBar";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { Footer } from "@/components/landing/Footer";

export async function MarketingPageShell({
  children,
  eyebrow,
  title,
  subtitle,
  narrow = false,
  jsonLd,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  narrow?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}) {
  const session = await auth();
  return (
    <main className="min-h-screen bg-[color:var(--dg-canvas)] text-[color:var(--dg-fg)]">
      {jsonLd && <JsonLd data={jsonLd} />}
      <StatusBar />
      <MarketingNav isLoggedIn={!!session} />
      <div className={`mx-auto ${narrow ? "max-w-3xl" : "max-w-[1400px]"} px-4 sm:px-6 py-12 sm:py-16`}>
        {(eyebrow || title || subtitle) && (
          <div className="mb-12 sm:mb-16 border-b border-[color:var(--dg-border)] pb-10">
            {eyebrow && <div className="dg-label flex items-center gap-3 mb-4"><span className="h-px w-6 bg-[color:var(--dg-electric)]" />{eyebrow}</div>}
            {title && <h1 className="font-sans text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-[color:var(--dg-fg)]">{title}</h1>}
            {subtitle && <p className="mt-4 text-[15px] text-[color:var(--dg-fg-muted)] max-w-2xl">{subtitle}</p>}
          </div>
        )}
        {children}
      </div>
      <Footer />
    </main>
  );
}
