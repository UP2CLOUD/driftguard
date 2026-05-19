import Link from "next/link";

function LogoIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded border border-[color:var(--dg-electric-dim)] bg-[color:var(--dg-electric-dim)]/30">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden>
        {/* Shield outline */}
        <path
          d="M10 2C8.5 2 5.5 3.1 4 4L4 9C4 13 7 15.5 10 17C13 15.5 16 13 16 9L16 4C14.5 3.1 11.5 2 10 2Z"
          stroke="#3f8cff"
          strokeWidth="1.1"
          strokeLinejoin="round"
          fill="rgba(63,140,255,0.08)"
        />
        {/* Drift lines */}
        <line x1="7" y1="7.5" x2="11" y2="7.5" stroke="#3f8cff" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="7.5" y1="10" x2="12.5" y2="10" stroke="#06b6d4" strokeWidth="1.1" strokeLinecap="round" />
        <line x1="8" y1="12.5" x2="11.5" y2="12.5" stroke="#3f8cff" strokeWidth="1.1" strokeLinecap="round" opacity="0.6" />
        {/* Dots */}
        <circle cx="11.5" cy="7.5" r="1" fill="#3f8cff" />
        <circle cx="13" cy="10" r="1" fill="#06b6d4" />
      </svg>
    </div>
  );
}

type DriftguardLogoProps = {
  href?: string;
  className?: string;
};

export function DriftguardLogo({ href = "/", className = "" }: DriftguardLogoProps) {
  const inner = (
    <>
      <LogoIcon />
      <span className="text-base font-bold lowercase tracking-tight text-zinc-100">driftguard</span>
    </>
  );

  const baseClass = `group flex items-center gap-2 transition-opacity hover:opacity-90 ${className}`;

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return <div className={baseClass}>{inner}</div>;
}
