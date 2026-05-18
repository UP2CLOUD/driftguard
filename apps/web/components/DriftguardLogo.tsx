import Link from "next/link";

function LogoIcon() {
  return (
    <div className="flex h-6 w-6 items-center justify-center rounded border border-orange-500/20 bg-orange-500/10 text-orange-400">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
        <path
          fillRule="evenodd"
          d="M12.516 2.17a.75.75 0 0 0-1.032 0 11.209 11.209 0 0 1-7.877 3.08.75.75 0 0 0-.722.515A12.74 12.74 0 0 0 2.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 0 0 .374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.39-.223-2.73-.635-3.985a.75.75 0 0 0-.722-.516l-.143.001c-2.996 0-5.717-1.17-7.734-3.08ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 6a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"
          clipRule="evenodd"
        />
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
