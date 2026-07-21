"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

export function CommandNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  
  // Transform background blur and opacity based on scroll
  const background = useTransform(
    scrollY,
    [0, 50],
    ["rgba(7, 8, 10, 0)", "rgba(7, 8, 10, 0.85)"]
  );
  const borderOpacity = useTransform(scrollY, [0, 50], [0, 1]);

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setScrolled(latest > 20);
    });
    return () => unsubscribe();
  }, [scrollY]);

  return (
    <motion.nav
      style={{ background }}
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md transition-all duration-300"
    >
      <motion.div 
        style={{ opacity: borderOpacity }}
        className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[color:var(--dg-border-strong)] to-transparent" 
      />
      
      <div className="flex items-center gap-4">
        <div className="relative flex items-center justify-center w-6 h-6">
          <div className="absolute inset-0 border border-[color:var(--dg-electric-bright)] rounded-sm animate-pulse opacity-50" />
          <div className="w-2 h-2 bg-[color:var(--dg-electric)] rounded-sm shadow-[0_0_8px_var(--dg-electric-bright)]" />
        </div>
        <Link href="/" className="font-mono text-[13px] font-medium tracking-[0.2em] text-white flex flex-col">
          <span>DRIFTGUARD</span>
          <span className="text-[8px] text-[color:var(--dg-fg-subtle)] tracking-widest mt-0.5">RUNTIME_LAYER</span>
        </Link>
      </div>

      <div className="hidden md:flex items-center gap-8 font-mono text-[10px] uppercase tracking-[0.15em] text-[color:var(--dg-fg-subtle)]">
        <Link href="#product" className="hover:text-white transition-colors relative group">
          <span className="absolute -inset-x-2 -inset-y-1 bg-[color:var(--dg-surface)] opacity-0 group-hover:opacity-100 rounded transition-opacity" />
          <span className="relative">Governance</span>
        </Link>
        <Link href="#architecture" className="hover:text-white transition-colors relative group">
          <span className="absolute -inset-x-2 -inset-y-1 bg-[color:var(--dg-surface)] opacity-0 group-hover:opacity-100 rounded transition-opacity" />
          <span className="relative">Architecture</span>
        </Link>
        <Link href="#compliance" className="hover:text-white transition-colors relative group">
          <span className="absolute -inset-x-2 -inset-y-1 bg-[color:var(--dg-surface)] opacity-0 group-hover:opacity-100 rounded transition-opacity" />
          <span className="relative">Compliance</span>
        </Link>
        <Link href="/docs" className="hover:text-white transition-colors relative group">
          <span className="absolute -inset-x-2 -inset-y-1 bg-[color:var(--dg-surface)] opacity-0 group-hover:opacity-100 rounded transition-opacity" />
          <span className="relative">Docs</span>
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <Link 
          href="/login" 
          className="group relative inline-flex items-center justify-center px-4 py-2 font-mono text-[11px] uppercase tracking-widest text-white overflow-hidden rounded bg-[color:var(--dg-surface-raised)] border border-[color:var(--dg-border-strong)] hover:border-[color:var(--dg-electric)] transition-colors"
        >
          <div className="absolute inset-0 bg-[color:var(--dg-electric)] opacity-0 group-hover:opacity-10 transition-opacity" />
          <span className="relative flex items-center gap-2">
            Initialize <span className="opacity-50">→</span>
          </span>
        </Link>
      </div>
    </motion.nav>
  );
}
