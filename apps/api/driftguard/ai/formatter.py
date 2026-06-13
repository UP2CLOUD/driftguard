from driftguard.ai.findings import Finding, aggregate_cost_cents
from driftguard.compliance import summarize_frameworks


def _footer() -> str:
    from driftguard.core.config import settings

    base = settings.public_base_url.rstrip("/")
    return f"\n\n---\n<sub>Reviewed by **Driftguard** · [docs]({base}/docs) · [feedback]({base}/feedback)</sub>"


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
    return s[:limit].replace("|", "\\|")


def _cost_section(findings: list[Finding]) -> str:
    cost = [f for f in findings if f.type == "cost"]
    if not cost:
        return ""
    lines = ["", f"<details><summary>💰 Cost changes ({len(cost)})</summary>", ""]
    lines.append("| Severity | Resource | Monthly delta |")
    lines.append("|---|---|---|")
    for f in cost[:25]:
        cents = f.extra.get("cents", 0)
        lines.append(f"| {_icon(f.severity)} {f.severity} | `{_esc(f.resource, 60)}` | **${cents / 100:+.2f}/mo** |")
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _changes_section(findings: list[Finding]) -> str:
    changes = [f for f in findings if f.type in ("change", "drift")]
    if not changes:
        return ""
    label = "📝 Plan changes" if all(f.type == "change" for f in changes) else "📝 Plan changes & drift"
    lines = ["", f"<details><summary>{label} ({len(changes)})</summary>", ""]
    lines.append("| Severity | Resource | Action |")
    lines.append("|---|---|---|")
    for f in changes[:30]:
        lines.append(f"| {_icon(f.severity)} {f.severity} | `{_esc(f.resource, 60)}` | {_esc(f.message, 80)} |")
    if len(changes) > 30:
        lines.append(f"\n_+{len(changes) - 30} more_")
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _security_section(title: str, findings: list[Finding]) -> str:
    if not findings:
        return ""
    lines = ["", f"<details><summary>{title} ({len(findings)})</summary>", ""]
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
    lines = ["", f"<details><summary>📋 Policy findings ({len(policy)})</summary>", ""]
    lines.append("| Sev | Rule | Resource | Message |")
    lines.append("|---|---|---|---|")
    for f in policy[:20]:
        rule = f"`{f.rule_id}`" if f.rule_id else "—"
        lines.append(
            f"| {_icon(f.severity)} {f.severity} | {rule} | `{_esc(f.resource, 60)}` | {_esc(f.message, 120)} |"
        )
    lines.append("")
    lines.append("</details>")
    return "\n".join(lines) + "\n"


def _verdict(risk_score: int, crit_high: int) -> str:
    if crit_high >= 3 or risk_score >= 70:
        return "🔴 **Needs attention** — critical/high findings require review before merge"
    if crit_high >= 1 or risk_score >= 40:
        return "🟠 **Review recommended** — high-severity findings detected"
    return "🟢 **Looks good** — no critical findings"


def format_comment(*, findings: list[Finding], ai_review_md: str, summary_meta: dict) -> str:
    cost_cents = aggregate_cost_cents(findings)
    cost_str = f"${cost_cents / 100:+.2f}/mo" if cost_cents else "no change"

    counts: dict[str, int] = {"cost": 0, "security": 0, "drift": 0, "policy": 0, "change": 0}
    sev_counts: dict[str, int] = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        counts[f.type] = counts.get(f.type, 0) + 1
        sev_counts[f.severity] = sev_counts.get(f.severity, 0) + 1

    sec = [f for f in findings if f.type == "security"]
    k8s_sec = [f for f in sec if _domain(f) == "kubernetes"]
    gha_sec = [f for f in sec if _domain(f) == "github_actions"]
    tf_sec = [f for f in sec if _domain(f) == "terraform"]

    framework_hits = summarize_frameworks([f.rule_id for f in findings])
    compliance_line = ""
    if framework_hits:
        ordered = ["DORA", "NIS2", "ISO27001", "GDPR", "CIS"]
        badges = [f"`{fw}:{framework_hits[fw]}`" for fw in ordered if fw in framework_hits]
        if badges:
            compliance_line = f"\n**Compliance:** {' '.join(badges)}"

    domain_parts = []
    if tf_sec:
        domain_parts.append(f"TF:{len(tf_sec)}")
    if k8s_sec:
        domain_parts.append(f"K8s:{len(k8s_sec)}")
    if gha_sec:
        domain_parts.append(f"GHA:{len(gha_sec)}")
    sec_detail = " (" + " · ".join(domain_parts) + ")" if domain_parts else ""

    crit_high = sev_counts["critical"] + sev_counts["high"]
    risk_score = summary_meta.get("risk_score", 0) or 0

    # Severity breakdown pills
    sev_parts = []
    for sev, icon in [("critical", "🔴"), ("high", "🟠"), ("medium", "🟡"), ("low", "🔵")]:
        if sev_counts[sev]:
            sev_parts.append(f"{icon} {sev_counts[sev]} {sev}")
    sev_line = " · ".join(sev_parts) if sev_parts else "✅ no findings"

    # Critical/high callout (above the fold, visible without expanding)
    callout = ""
    critical_findings = [f for f in findings if f.severity in ("critical", "high")]
    if critical_findings:
        callout = "\n\n**Top issues:**\n"
        for f in critical_findings[:5]:
            icon = _icon(f.severity)
            rule = f" `{f.rule_id}`" if f.rule_id else ""
            callout += f"> {icon} **{f.severity.upper()}**{rule} — `{_esc(f.resource, 50)}` — {_esc(f.message, 100)}\n"
            if f.suggestion:
                callout += f">    💡 {_esc(f.suggestion, 100)}\n"
        if len(critical_findings) > 5:
            callout += f"> _+{len(critical_findings) - 5} more critical/high below_\n"

    header = (
        f"### 🛡️ DriftGuard Analysis\n\n"
        f"{_verdict(risk_score, crit_high)}\n\n"
        f"| Risk score | Findings | Cost impact | Changes |\n"
        f"|:---:|:---:|:---:|:---:|\n"
        f"| **{risk_score}/100** | {len(findings)}{sec_detail} | {cost_str} | {counts['change']} |"
        f"\n\n{sev_line}{compliance_line}{callout}"
    )

    findings_block = (
        _cost_section(findings)
        + _changes_section(findings)
        + _security_section("🔷 Kubernetes security", k8s_sec)
        + _security_section("⚙️ GitHub Actions security", gha_sec)
        + _security_section("🏗️ Terraform/IaC security", tf_sec)
        + _policy_section(findings)
    )

    ai_block = ""
    if ai_review_md and "unavailable" not in ai_review_md and ai_review_md.strip() != "_debug_":
        ai_block = f"\n<details><summary>🤖 AI review</summary>\n\n{ai_review_md.strip()}\n\n</details>\n"
    elif ai_review_md and "unavailable" in ai_review_md:
        ai_block = ""  # suppress "unavailable" message — static callout above is enough

    meta_block = ""
    if summary_meta:
        sha = summary_meta.get("sha", "")[:7]
        aws_note = " · ☁️ live AWS drift" if summary_meta.get("has_real_aws") else ""
        meta_block = (
            f"\n<sub>analyzed in {summary_meta.get('duration_ms', 0)}ms"
            f"{' · risk ' + str(risk_score) + '/100' if risk_score else ''}"
            f" · sha `{sha}`{aws_note}</sub>\n"
        )

    return header + "\n" + ai_block + findings_block + meta_block + _footer()
