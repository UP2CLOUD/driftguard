import { Finding, severityColor } from "@/lib/api";

export function FindingsTable({ findings }: { findings: Finding[] }) {
  if (findings.length === 0) {
    return <p className="text-muted">No findings.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-ink/10">
      <table className="w-full text-sm">
        <thead className="bg-ink/5 text-left text-xs uppercase tracking-widest text-muted">
          <tr>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Resource</th>
            <th className="px-4 py-3">Message</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink/5">
          {findings.map((f, i) => (
            <tr key={i}>
              <td className="px-4 py-3 font-mono text-xs">{f.type}</td>
              <td className="px-4 py-3">
                <span className={`inline-block rounded px-2 py-0.5 text-xs ${severityColor(f.severity)}`}>
                  {f.severity}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-xs">{f.resource}</td>
              <td className="px-4 py-3">{f.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
