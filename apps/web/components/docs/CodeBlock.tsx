import { CopyButton } from "@/components/docs/CopyButton";

interface CodeBlockProps {
  code: string;
  /** Optional label shown in the header strip (e.g. a filename). */
  filename?: string;
  /** Accessible label for the copy button. */
  copyLabel?: string;
}

/**
 * A read-only code block with a copy-to-clipboard button positioned top-right.
 * Server-friendly: only the <CopyButton> island is a client component.
 */
export function CodeBlock({ code, filename, copyLabel }: CodeBlockProps) {
  return (
    <div className="relative overflow-hidden rounded border border-[color:var(--dg-border-strong)] bg-[color:var(--dg-surface)]">
      {filename ? (
        <div className="flex items-center justify-between border-b border-[color:var(--dg-border)] bg-[color:var(--dg-surface-raised)] px-4 py-2 font-mono text-[11px] text-[color:var(--dg-fg-subtle)]">
          <span>{filename}</span>
        </div>
      ) : null}
      <CopyButton text={code} label={copyLabel ?? "Copy code to clipboard"} />
      <pre className="overflow-x-auto p-4 pr-16 font-mono text-[12px] leading-relaxed text-[color:var(--dg-fg)]">{code}</pre>
    </div>
  );
}
