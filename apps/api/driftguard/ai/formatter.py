from driftguard.ai.findings import Finding, aggregate_cost_cents
from driftguard.compliance import summarize_frameworks

FOOTER = (
    "\n\n---\n"
    "<sub>Reviewed by **Driftguard** · "
    "[docs](https://driftguard.dev/docs) · "
    "[feedback](https://driftguard.dev/feedback)</sub>"
)

_SEV_ICON = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🔵", "info": "⚪"}


def _icon(sev: str) -> str:
    return _SEV_ICON.get(sev, "⚪")


def _domain(f: Finding) -> str:
    """Classify finding's technology domain from its rule_id prefix."""
    rid = (f.rule_id or "").upper()
    if rid.startswith("K8S"):
        return "kubernetes"
    if rid.startswith("GHA"):
        return "github_actions"
    return "terraform"


def _esc(s: str, limit: int) -> str:
    return s.replace("|", "\\|")[:limit]


def _cost_section(findings: list[Finding]) -> str:
    cost = [f for f in findings if f.type == "cost"]
    if not cost:
        return ""
    lines = ["", "<details><summary>💰 Cost changes (%d)</summary>" % len(cost), ""]
    lines.append("| Severity | Resource | Monthly delta |")
    lines.append("|---|---|---|")
    for f in cost[:25]:
        cents = f.extra.get("cents", 0)
        lines.append(
            f"| {_icon(f.severity)} {f.severity} "
            f"| `{_esc(f.resource, 60)}` "
            f"| **${cents / 100:+.2f}/mo** |"
        )
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _changes_section(findings: list[Finding]) -> str:
    changes = [f for f in findings if f.type in ("change", "drift")]
    if not changes:
        return ""
    label = "📝 Plan changes" if all(f.type == "change" for f in changes) else "📝 Plan changes & drift"
    lines = ["", "<details><summary>%s (%d)</summary>" % (label, len(changes)), ""]
    lines.append("| Severity | Resource | Action |")
    lines.append("|---|---|---|")
    for f in changes[:30]:
        lines.append(
            f"| {_icon(f.severity)} {f.severity} "
            f"| `{_esc(f.resource, 60)}` "
            f"| {_esc(f.message, 80)} |"
        )
    if len(changes) > 30:
        lines.append(f"\n_+{len(changes) - 30} more_")
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _security_section(title: str, findings: list[Finding]) -> str:
    if not findings:
        return ""
    lines = ["", "<details><summary>%s (%d)</summary>" % (title, len(findings)), ""]
    lines.append("| Sev | Rule | Resource | Finding | Remediation |")
    lines.append("|---|---|---|---|---|")
    for f in findings[:30]:
        rule = f"`{f.rule_id}`" if f.rule_id else "—"
        suggestion = _esc(f.suggestion, 80) if f.suggestion else "—"
        lines.append(
            f"| {_icon(f.severity)} {f.severity} "
            f"| {rule} "
            f"| `{_esc(f.resource, 50)}` "
            f"| {_esc(f.message, 100)} "
            f"| {suggestion} |"
        )
    if len(findings) > 30:
        lines.append(f"\n_+{len(findings) - 30} more_")
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _policy_section(findings: list[Finding]) -> str:
    policy = [f for f in findings if f.type == "policy"]
    if not policy:
        return ""
    lines = ["", "<details><summary>📋 Policy findings (%d)</summary>" % len(policy), ""]
    lines.append("| Sev | Rule | Resource | Message |")
    lines.append("|---|---|---|---|")
    for f in policy[:20]:
        rule = f"`{f.rule_id}`" if f.rule_id else "—"
        lines.append(
            f"| {_icon(f.severity)} {f.severity} "
            f"| {rule} "
            f"| `{_esc(f.resource, 60)}` "
            f"| {_esc(f.message, 120)} |"
        )
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def format_comment(*, findings: list[Finding], ai_review_md: str, summary_meta: dict) -> str:
    cost_cents = aggregate_cost_cents(findings)
    cost_str = f"${cost_cents / 100:+.2f}/mo" if cost_cents else "no change"

    counts: dict[str, int] = {"cost": 0, "security": 0, "drift": 0, "policy": 0, "change": 0}
    sev_counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        counts[f.type] = counts.get(f.type, 0) + 1
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    # Split security findings by technology domain
    sec = [f for f in findings if f.type == "security"]
    k8s_sec = [f for f in sec if _domain(f) == "kubernetes"]
    gha_sec = [f for f in sec if _domain(f) == "github_actions"]
    tf_sec = [f for f in sec if _domain(f) == "terraform"]

    framework_hits = summarize_frameworks([f.rule_id for f in findings])
    compliance_line = ""
    if framework_hits:
        ordered = ["DORA", "NIS2", "ISO27001", "GDPR", "CIS"]
        badges = [f"{fw}: {framework_hits[fw]}" for fw in ordered if fw in framework_hits]
        if badges:
            compliance_line = f"**Compliance hits:** {' · '.join(badges)}\n"

    # Domain breakdown suffix for the security count
    domain_parts = []
    if tf_sec:
        domain_parts.append(f"TF: {len(tf_sec)}")
    if k8s_sec:
        domain_parts.append(f"K8s: {len(k8s_sec)}")
    if gha_sec:
        domain_parts.append(f"GHA: {len(gha_sec)}")
    sec_detail = " (" + ", ".join(domain_parts) + ")" if domain_parts else ""

    crit_high = sev_counts["critical"] + sev_counts["high"]
    header = (
        f"### 🛡️ Driftguard review\n\n"
        f"**Cost impact:** {cost_str} · "
        f"**Security:** {counts['security']}{sec_detail} · "
        f"**Changes:** {counts['change']} · "
        f"**Critical/High:** {crit_high}\n"
        f"{compliance_line}"
    )

    findings_block = (
        _cost_section(findings)
        + _changes_section(findings)
        + _security_section("🔷 Kubernetes security", k8s_sec)
        + _security_section("⚙️ GitHub Actions security", gha_sec)
        + _security_section("🏗️ Terraform/IaC security", tf_sec)
        + _policy_section(findings)
    )

    meta_block = ""
    if summary_meta:
        aws_note = " · live AWS drift" if summary_meta.get("has_real_aws") else ""
        meta_block = (
            f"\n<sub>analyzed in {summary_meta.get('duration_ms', 0)}ms · "
            f"sha `{summary_meta.get('sha', '')[:7]}`{aws_note}</sub>\n"
        )

    return header + "\n" + ai_review_md.strip() + "\n" + findings_block + meta_block + FOOTER
