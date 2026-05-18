"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function MarketingNav({ isLoggedIn }: { isLoggedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`sticky top-0 z-50 transition-all duration-200 ${
        scrolled
          ? "border-b border-[color:var(--dg-border)] bg-[color:var(--dg-canvas)]/90 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-10">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="relative">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-[color:var(--dg-electric)]">
                <path d="M2 3 L10 7 L18 3 L18 13 L10 17 L2 13 Z" stroke="currentColor" strokeWidth="1.4" />
                <path d="M10 7 L10 17" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
                <circle cx="10" cy="3" r="0.8" fill="currentColor" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-1 w-1 rounded-full bg-allowed dg-pulse" />
            </div>
            <span className="font-sans text-[15px] font-semibold tracking-tight text-[color:var(--dg-fg)]">
              driftguard
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-[13px] text-[color:var(--dg-fg-muted)]">
            <Link href="#product" className="hover:text-[color:var(--dg-fg)] transition">Product</Link>
            <Link href="#architecture" className="hover:text-[color:var(--dg-fg)] transition">Architecture</Link>
            <Link href="#integrate" className="hover:text-[color:var(--dg-fg)] transition">Integrate</Link>
            <Link href="#pricing" className="hover:text-[color:var(--dg-fg)] transition">Pricing</Link>
            <Link href="/docs" className="hover:text-[color:var(--dg-fg)] transition">Docs</Link>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://github.com/UP2CLOUD/driftguard"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px] text-[color:var(--dg-fg-subtle)] hover:text-[color:var(--dg-fg)] transition"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 .2a8 8 0 00-2.5 15.6c.4.1.5-.2.5-.4v-1.5c-2.2.5-2.7-1-2.7-1-.4-.9-.9-1.2-.9-1.2-.7-.5.1-.5.1-.5.8.1 1.2.8 1.2.8.7 1.2 1.9.9 2.4.7.1-.5.3-.9.5-1.1-1.8-.2-3.6-.9-3.6-3.9 0-.9.3-1.6.8-2.1-.1-.2-.4-1 .1-2.1 0 0 .7-.2 2.2.8.6-.2 1.3-.3 2-.3s1.4.1 2 .3c1.5-1 2.2-.8 2.2-.8.4 1.1.2 1.9.1 2.1.5.6.8 1.3.8 2.1 0 3-1.8 3.7-3.6 3.9.3.2.5.7.5 1.5v2.2c0 .2.1.5.6.4A8 8 0 008 .2z"/></svg>
            <span className="tabular-nums">★ 1.2k</span>
          </a>
          {isLoggedIn ? (
            <Link href="/dashboard" className="dg-button dg-button-ghost">Dashboard →</Link>
          ) : (
            <Link href="/?signin=true" className="dg-button dg-button-primary">
              Get started
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
