"""Slack webhook notifications for high-severity incidents."""

from __future__ import annotations

import httpx
import structlog

from driftguard.core.config import settings

log = structlog.get_logger(__name__)


async def notify_incident(
    *,
    title: str,
    severity: str,
    repo: str,
    pr_number: int | None = None,
    risk_score: int | None = None,
    analysis_url: str = "",
    findings: list[str] | None = None,
) -> bool:
    """Post a Slack block message. Returns True on success."""
    webhook_url = getattr(settings, "slack_webhook_url", "") or ""
    if not webhook_url:
        log.debug("slack.skip", reason="SLACK_WEBHOOK_URL not set")
        return False

    color = {"critical": "#ff4757", "high": "#ff8800", "medium": "#ffb020"}.get(severity, "#9aa0a6")
    finding_lines = "\n".join(f"• {f}" for f in (findings or [])[:5])

    payload: dict = {
        "attachments": [
            {
                "color": color,
                "blocks": [
                    {
                        "type": "section",
                        "text": {
                            "type": "mrkdwn",
                            "text": f"*DriftGuard — {severity.upper()} incident*\n{title}",
                        },
                    },
                    {
                        "type": "section",
                        "fields": [
                            {"type": "mrkdwn", "text": f"*Repo*\n`{repo}`"},
                            {
                                "type": "mrkdwn",
                                "text": f"*PR*\n#{pr_number}"
                                if pr_number
                                else {"type": "mrkdwn", "text": "*Severity*\n" + severity},
                            },
                            {
                                "type": "mrkdwn",
                                "text": f"*Risk score*\n{risk_score}/100"
                                if risk_score
                                else {"type": "mrkdwn", "text": "*Status*\nOpen"},
                            },
                        ],
                    },
                    *(
                        [{"type": "section", "text": {"type": "mrkdwn", "text": f"*Findings*\n{finding_lines}"}}]
                        if finding_lines
                        else []
                    ),
                    *(
                        [
                            {
                                "type": "actions",
                                "elements": [
                                    {
                                        "type": "button",
                                        "text": {"type": "plain_text", "text": "View Analysis"},
                                        "url": analysis_url,
                                        "style": "primary",
                                    }
                                ],
                            }
                        ]
                        if analysis_url
                        else []
                    ),
                ],
            }
        ]
    }

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.post(webhook_url, json=payload)
            resp.raise_for_status()
            log.info("slack.sent", title=title, severity=severity)
            return True
    except Exception as exc:
        log.warning("slack.failed", error=str(exc))
        return False
