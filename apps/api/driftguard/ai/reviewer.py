import json

from anthropic import AsyncAnthropic

from driftguard.core.config import settings

_client: AsyncAnthropic | None = None


def client() -> AsyncAnthropic:
    global _client
    if _client is None:
        _client = AsyncAnthropic(api_key=settings.anthropic_api_key)
    return _client


SYSTEM_PROMPT = """You are Driftguard, an expert Terraform PR reviewer.

You receive a list of structured findings (cost, drift, security, policy)
already computed by deterministic tools. Your job is to:
1. Synthesize them into a high-signal PR review.
2. Prioritize by blast radius and severity.
3. Suggest actionable fixes with code blocks when applicable.

Hard rules:
- NEVER invent cost numbers. Only use values present in findings.
- ALWAYS cite resource addresses exactly as given.
- If findings list is empty, say so plainly.
- Be concise. Markdown only. No preamble, no signoff.
- Maximum 5 prioritized actions.
"""


def _user_prompt(findings: list[dict], pr_context: dict) -> str:
    return f"""PR: {pr_context.get("repo")}#{pr_context.get("pr_number")}
Head SHA: {pr_context.get("head_sha")}

Findings:
```json
{json.dumps(findings, indent=2)}
```

Produce a PR review in markdown with these sections:
## Summary
## Cost impact
## Drift risk
## Security findings
## Suggested actions
"""


async def review(findings: list[dict], pr_context: dict) -> str:
    msg = await client().messages.create(
        model=settings.anthropic_model,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _user_prompt(findings, pr_context)}],
    )
    parts = [b.text for b in msg.content if getattr(b, "type", None) == "text"]
    return "\n".join(parts)
