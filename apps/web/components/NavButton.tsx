import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

const navInteractionClass =
  "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium text-[color:var(--dg-fg-muted)] transition duration-150 ease-out hover:text-[color:var(--dg-fg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--dg-electric)]/30 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.98] active:opacity-90";

type NavButtonProps = {
  children: ReactNode;
  className?: string;
};

export function NavAnchor({
  href,
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"a"> & NavButtonProps) {
  return (
    <a href={href} className={`${navInteractionClass} ${className}`} {...props}>
      {children}
    </a>
  );
}

export function NavLink({
  href,
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<typeof Link> & NavButtonProps) {
  return (
    <Link href={href} className={`${navInteractionClass} ${className}`} {...props}>
      {children}
    </Link>
  );
}

export function NavSubmitButton({
  children,
  className = "",
  ...props
}: ComponentPropsWithoutRef<"button"> & NavButtonProps) {
  return (
    <button type="submit" className={`${navInteractionClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
