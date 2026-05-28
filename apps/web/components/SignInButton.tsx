import { signInWithGitHub } from "@/lib/auth-actions";

export function SignInButton({
  className,
  children = "Get started",
  dataTransition,
}: {
  className?: string;
  children?: React.ReactNode;
  dataTransition?: "github" | "dashboard" | "generic";
}) {
  return (
    <form action={signInWithGitHub}>
      <button
        type="submit"
        className={className}
        data-transition={dataTransition}
      >
        {children}
      </button>
    </form>
  );
}
