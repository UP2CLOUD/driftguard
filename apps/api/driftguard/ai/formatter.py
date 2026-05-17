from driftguard.ai.findings import Finding, aggregate_cost_cents

FOOTER = (
    "\n\n---\n"
    "<sub>Reviewed by **Driftguard** · "
    "[docs](https://driftguard.dev/docs) · "
    "[feedback](https://driftguard.dev/feedback)</sub>"
)


def format_comment(*, findings: list[Finding], ai_review_md: str, summary_meta: dict) -> str:
    cost_cents = aggregate_cost_cents(findings)
    cost_str = f"${cost_cents / 100:+.2f}/mo" if cost_cents else "no change"

    counts: dict[str, int] = {"cost": 0, "security": 0, "drift": 0, "policy": 0, "change": 0}
    sev_counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        counts[f.type] = counts.get(f.type, 0) + 1
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    header = (
        f"### 🛡️ Driftguard review\n\n"
        f"**Cost impact:** {cost_str} · "
        f"**Security:** {counts['security']} · "
        f"**Changes:** {counts['change']} · "
        f"**Critical/High:** {sev_counts['critical'] + sev_counts['high']}\n"
    )

    findings_block = ""
    if findings:
        findings_block = "\n<details><summary>All findings (" + str(len(findings)) + ")</summary>\n\n"
        findings_block += "| Type | Severity | Resource | Message |\n|---|---|---|---|\n"
        for f in findings[:50]:
            msg = f.message.replace("|", "\\|")[:140]
            res = f.resource.replace("|", "\\|")[:60]
            findings_block += f"| {f.type} | {f.severity} | `{res}` | {msg} |\n"
        if len(findings) > 50:
            findings_block += f"\n_+{len(findings) - 50} more_\n"
        findings_block += "\n</details>\n"

    meta_block = ""
    if summary_meta:
        meta_block = f"\n<sub>analyzed in {summary_meta.get('duration_ms', 0)}ms · "
        meta_block += f"sha `{summary_meta.get('sha', '')[:7]}`</sub>\n"

    return header + "\n" + ai_review_md.strip() + "\n" + findings_block + meta_block + FOOTER
