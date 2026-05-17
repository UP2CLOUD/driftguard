import json

from anthropic import AsyncAnthropic

from driftguard.ai.findings import Finding
from driftguard.compliance import control_summary
from driftguard.core.config import settings

_client: AsyncAnthropic | None = None


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


SYSTEM_PROMPT = """You are Driftguard, an expert reviewer of OpenTofu and Terraform PRs.

You receive structured findings (cost, change, security, policy) already computed
by deterministic tools (terraform plan parser, infracost, checkov). Each finding
may include a precomputed list of `controls` mapping it to compliance domains:
encryption_at_rest, encryption_in_transit, public_exposure, logging_audit,
access_control, backup_retention, vulnerability_management, change_management.

Your job:
1. Synthesize findings into a high-signal review.
2. Prioritize by blast radius and severity.
3. In "Compliance notes", cite specific framework references from the provided
   compliance_context — never invent control codes.
4. Suggest actionable fixes with code blocks when applicable.

Hard rules:
- NEVER invent cost numbers, resource names, control codes, or rule IDs.
- ALWAYS cite resource addresses exactly as given.
- If findings list is empty, say so plainly in one line.
- Be concise. Markdown only. No preamble, no signoff. No emojis.
- Maximum 5 prioritized actions.
"""


def _user_prompt(findings: list[Finding], pr_context: dict) -> str:
    head = pr_context.get("head_sha", "")[:12]
    compliance_ctx = control_summary([f.rule_id for f in findings])
    compliance_ctx_serializable = {
        cid: [{"framework": r.framework, "code": r.code, "title": r.title} for r in refs]
        for cid, refs in compliance_ctx.items()
    }
    return f"""PR: {pr_context.get("repo")}#{pr_context.get("pr_number")}
Head: {head}

Findings:
```json
{json.dumps([f.to_dict() for f in findings], indent=2)}
```

Compliance context (use ONLY these refs in compliance notes):
```json
{json.dumps(compliance_ctx_serializable, indent=2)}
```

Produce markdown with sections:
## Summary
## Cost impact
## Security
## Compliance notes
## Suggested actions
"""


async def review(findings: list[Finding], pr_context: dict) -> str:
    if not findings:
        return (
            "## Summary\nNo material changes detected in this PR.\n\n"
            "## Cost impact\nNone.\n\n## Security\nNone.\n\n"
            "## Compliance notes\nNone.\n\n## Suggested actions\nNone."
        )
    msg = await client().messages.create(
        model=settings.anthropic_model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(findings, pr_context)}],
    )
    parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
    return "\n".join(parts)
