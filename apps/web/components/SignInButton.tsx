import { signInWithGitHub } from "@/lib/auth-actions";

export function SignInButton({
  className,
  children = "Get started",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={signInWithGitHub}>
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
