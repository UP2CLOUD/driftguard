"""Email service — Resend.

Transactional emails: PR review complete, policy violations, billing alerts.
Dev: prints to stdout if RESEND_API_KEY not set.
"""
from __future__ import annotations

import structlog

from driftguard.core.config import settings

log = structlog.get_logger(__name__)


def _client():
    import resend
    resend.api_key = settings.resend_api_key
    return resend


async def send_review_complete(
    *,
    to: str,
    repo: str,
    pr_number: int,
    risk_score: int,
    findings_count: int,
    analysis_url: str,
) -> None:
    """Notify when a PR review finishes."""
    subject = f"[DriftGuard] PR #{pr_number} reviewed — {repo}"
    risk_label = "HIGH" if risk_score > 70 else "MEDIUM" if risk_score > 40 else "LOW"
    html = f"""
<div style="font-family:monospace;max-width:600px;margin:0 auto;background:#07080a;color:#e8eaed;padding:32px;border-radius:6px;">
  <div style="font-size:18px;font-weight:700;margin-bottom:8px;">DriftGuard · PR Review Complete</div>
  <div style="color:#9aa0a6;margin-bottom:24px;">{repo} / PR #{pr_number}</div>

  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:8px;border:1px solid #1a1e25;color:#9aa0a6;">Risk score</td>
      <td style="padding:8px;border:1px solid #1a1e25;color:{'#ff4757' if risk_score > 70 else '#ffb020' if risk_score > 40 else '#22d38d'};font-weight:700;">{risk_score} / 100 ({risk_label})</td>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #1a1e25;color:#9aa0a6;">Findings</td>
      <td style="padding:8px;border:1px solid #1a1e25;">{findings_count}</td>
    </tr>
  </table>

  <div style="margin-top:24px;">
    <a href="{analysis_url}" style="display:inline-block;background:#3f8cff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-size:13px;">
      View full analysis →
    </a>
  </div>

  <div style="margin-top:24px;color:#525c6b;font-size:11px;">
    You're receiving this because your organisation uses DriftGuard.<br>
    <a href="https://driftguard.io/dashboard" style="color:#3f8cff;">Manage notifications</a>
  </div>
</div>
"""
    await _send(to=to, subject=subject, html=html)


async def send_policy_violation(
    *,
    to: str,
    repo: str,
    pr_number: int,
    resource: str,
    reason: str,
    analysis_url: str,
) -> None:
    subject = f"[DriftGuard] BLOCKED — {resource} in PR #{pr_number}"
    html = f"""
<div style="font-family:monospace;max-width:600px;margin:0 auto;background:#07080a;color:#e8eaed;padding:32px;border-radius:6px;">
  <div style="font-size:18px;font-weight:700;color:#ff4757;margin-bottom:8px;">■ Policy violation blocked</div>
  <div style="color:#9aa0a6;margin-bottom:24px;">{repo} / PR #{pr_number}</div>
  <div style="background:#1a1e25;padding:16px;border-radius:4px;margin-bottom:16px;">
    <div style="color:#9aa0a6;font-size:11px;margin-bottom:4px;">RESOURCE</div>
    <div>{resource}</div>
    <div style="color:#9aa0a6;font-size:11px;margin-top:12px;margin-bottom:4px;">REASON</div>
    <div style="color:#ff4757;">{reason}</div>
  </div>
  <a href="{analysis_url}" style="display:inline-block;background:#3f8cff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-size:13px;">
    View analysis →
  </a>
</div>
"""
    await _send(to=to, subject=subject, html=html)


async def send_welcome(*, to: str, org_name: str) -> None:
    subject = "Welcome to DriftGuard — you're set up"
    html = f"""
<div style="font-family:monospace;max-width:600px;margin:0 auto;background:#07080a;color:#e8eaed;padding:32px;border-radius:6px;">
  <div style="font-size:18px;font-weight:700;margin-bottom:8px;">DriftGuard is active for {org_name}</div>
  <p style="color:#9aa0a6;">Open a Terraform or OpenTofu PR on any connected repository and DriftGuard will post a review within ~30 seconds.</p>
  <p style="color:#9aa0a6;">The review includes:</p>
  <ul style="color:#9aa0a6;padding-left:20px;">
    <li>Monthly cost delta (Infracost)</li>
    <li>Security findings (Checkov + AI triage)</li>
    <li>Drift vs live cloud state</li>
    <li>DORA / NIS2 / ISO 27001 compliance evidence</li>
    <li>Semantic citations from past incidents</li>
  </ul>
  <a href="https://driftguard.io/docs" style="display:inline-block;background:#3f8cff;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;font-size:13px;margin-top:16px;">
    Read the docs →
  </a>
</div>
"""
    await _send(to=to, subject=subject, html=html)


async def _send(*, to: str, subject: str, html: str) -> None:
    if not settings.resend_api_key:
        log.info("email.dev.print", to=to, subject=subject)
        return
    try:
        import resend
        resend.api_key = settings.resend_api_key
        resend.Emails.send({
            "from": settings.resend_from,
            "to": [to],
            "subject": subject,
            "html": html,
        })
        log.info("email.sent", to=to, subject=subject)
    except Exception as exc:
        log.error("email.send.failed", to=to, error=str(exc))
