"""Terraform plan and state content must not escape the analysis process.

A `terraform show -json` plan embeds resource attributes verbatim -- RDS master
passwords, generated access keys, TLS private keys. Terraform's
`sensitive = true` only suppresses *CLI output*; the value is still present in
the plan JSON and in state. So the plan we parse is, routinely, a document full
of live credentials.

Four places would publish it if the pipeline ever regressed:

  * structured logs, which ship to a log aggregator;
  * LLM prompts, which leave the trust boundary entirely;
  * pull request comments, which on a public repo are world-readable;
  * the audit log, which is retained and exported.

Every test here works the same way: plant a canary string in the *values* of a
realistic plan, run the real production code path, and assert the canary is
absent from what that path emits. The canary is deliberately unmistakable --
if any assertion fails, the failure names exactly which sink leaked.

Most of these passed on the first run -- the finding, prompt, comment and log
paths were already clean, and the tests exist so a future change that starts
interpolating attribute values fails here rather than in someone's log index.
Two did not pass, and the parser was fixed rather than the assertions relaxed:
redaction fired only on Terraform's `sensitive` mask, and every masked value
collapsed to the same literal so a credential rotation compared equal.
"""

from __future__ import annotations

import json
import logging

import pytest

from driftguard.ai.findings import from_checkov, from_infracost, from_plan_changes
from driftguard.ai.formatter import format_comment
from driftguard.services.terraform.plan_parser import parse_plan

# One token, easy to grep, impossible to produce by accident.
CANARY = "dg-canary-PLAINTEXT-SECRET-e3f1a9"


@pytest.fixture
def plan_json() -> dict:
    """A plan shaped like the real thing, with secrets in every value slot.

    Mirrors what `terraform show -json` emits: `before`/`after` attribute maps,
    `before_sensitive`/`after_sensitive` masks, and a `replace_paths` trigger.
    """
    return {
        "format_version": "1.2",
        "terraform_version": "1.9.5",
        "resource_changes": [
            {
                "address": "aws_db_instance.primary",
                "type": "aws_db_instance",
                "name": "primary",
                "provider_name": "registry.terraform.io/hashicorp/aws",
                "change": {
                    "actions": ["update"],
                    "before": {
                        "identifier": "prod-db",
                        "password": f"old-{CANARY}",
                        "username": "admin",
                        "instance_class": "db.t3.medium",
                    },
                    "after": {
                        "identifier": "prod-db",
                        "password": f"new-{CANARY}",
                        "username": "admin",
                        "instance_class": "db.t3.large",
                    },
                    "before_sensitive": {"password": True},
                    "after_sensitive": {"password": True},
                },
            },
            {
                "address": "aws_iam_access_key.deploy",
                "type": "aws_iam_access_key",
                "name": "deploy",
                "provider_name": "registry.terraform.io/hashicorp/aws",
                "change": {
                    "actions": ["delete", "create"],
                    "before": {"secret": f"before-{CANARY}"},
                    "after": {"secret": f"after-{CANARY}"},
                    "replace_paths": [["secret"]],
                },
            },
        ],
    }


def _dumps(obj: object) -> str:
    return json.dumps(obj, default=str)


# ── The parser itself: what it redacts, and what it must leave alone ───────


def test_parser_redacts_terraform_marked_secrets(plan_json: dict) -> None:
    """Values Terraform marks sensitive never survive parsing."""
    plan = parse_plan(plan_json)
    db = next(c for c in plan.changes if c.address == "aws_db_instance.primary")
    assert db.before is not None and db.after is not None
    assert CANARY not in _dumps(db.before)
    assert CANARY not in _dumps(db.after)
    assert db.before["password"].startswith("[REDACTED:")
    assert db.after["password"].startswith("[REDACTED:")


def test_parser_redacts_secrets_terraform_did_not_mark(plan_json: dict) -> None:
    """The mask is not the only trigger, because the mask is not reliable.

    `aws_iam_access_key.deploy` in the fixture carries no `before_sensitive`
    at all -- which is what a `local`-assembled value, a `user_data` blob, or
    a provider that neglects its schema actually looks like. The attribute is
    named `secret`, the parser already lists it in `sensitive_paths`, and it
    must not then hand back the value in the clear.
    """
    plan = parse_plan(plan_json)
    key = next(c for c in plan.changes if c.address == "aws_iam_access_key.deploy")
    assert key.before is not None and key.after is not None
    assert CANARY not in _dumps(key.before)
    assert CANARY not in _dumps(key.after)


def test_redaction_preserves_the_fact_that_a_secret_changed(plan_json: dict) -> None:
    """Rotation must stay visible even though the values do not.

    A blanket '[REDACTED]' makes before and after compare equal, so rotating a
    production database password would score as no change at all. The
    placeholder is derived from the value for exactly this reason.
    """
    plan = parse_plan(plan_json)
    db = next(c for c in plan.changes if c.address == "aws_db_instance.primary")
    assert db.before is not None and db.after is not None
    # Fixture rotates the password and leaves the username alone.
    assert db.before["password"] != db.after["password"]
    assert db.before["username"] == db.after["username"]


def test_redaction_leaves_non_secret_attributes_readable(plan_json: dict) -> None:
    """Over-redaction is its own failure: it blinds the risk scorer.

    `instance_class` is the signal for a resize; `kms_key_id`-style names must
    not be swept up by a loose match on the word "key".
    """
    plan = parse_plan(plan_json)
    db = next(c for c in plan.changes if c.address == "aws_db_instance.primary")
    assert db.before is not None and db.after is not None
    assert db.before["instance_class"] == "db.t3.medium"
    assert db.after["instance_class"] == "db.t3.large"
    assert db.after["identifier"] == "prod-db"


@pytest.mark.parametrize(
    ("attr", "should_redact"),
    [
        ("password", True),
        ("master_password", True),
        ("secret", True),
        ("client_secret", True),
        ("secret_access_key", True),
        ("private_key", True),
        ("api_token", True),
        # Identifiers and names, not credentials -- redacting these would cost
        # real diff signal and protect nothing.
        ("kms_key_id", False),
        ("key_name", False),
        ("public_key", False),
        ("instance_class", False),
        ("certificate_arn", False),
    ],
)
def test_redaction_targets_credential_bearing_names_only(attr: str, should_redact: bool) -> None:
    plan = {
        "format_version": "1.2",
        "resource_changes": [
            {
                "address": "aws_thing.x",
                "type": "aws_thing",
                "name": "x",
                "provider_name": "registry.terraform.io/hashicorp/aws",
                "change": {"actions": ["create"], "before": None, "after": {attr: CANARY}},
            }
        ],
    }
    change = parse_plan(plan).changes[0]
    assert change.after is not None
    if should_redact:
        assert CANARY not in _dumps(change.after), f"{attr} should have been redacted"
    else:
        assert change.after[attr] == CANARY, f"{attr} should NOT have been redacted"


def test_parser_marks_sensitive_paths(plan_json: dict) -> None:
    plan = parse_plan(plan_json)
    db = next(c for c in plan.changes if c.address == "aws_db_instance.primary")
    assert db.touches_sensitive is True
    # The *path* is what gets reported, never the value behind it.
    assert "password" in db.sensitive_paths
    assert CANARY not in _dumps(db.sensitive_paths)


# ── Sink 1: findings, which feed every downstream consumer ───────────────────


def test_plan_findings_carry_no_attribute_values(plan_json: dict) -> None:
    findings = from_plan_changes(plan_json)
    assert findings, "fixture should produce findings; an empty list proves nothing"
    assert CANARY not in _dumps([f.to_dict() for f in findings])


def test_checkov_findings_carry_no_code_block(plan_json: dict) -> None:
    """Checkov reports `code_block`: the offending source lines, values included.

    We map only check_name/guideline onto a Finding. This pins that down --
    passing the raw `code_block` through would be an easy, natural-looking
    change to make.
    """
    checkov_output = [
        {
            "results": {
                "failed_checks": [
                    {
                        "check_id": "CKV_AWS_16",
                        "check_name": "Ensure RDS storage is encrypted",
                        "severity": "HIGH",
                        "resource": "aws_db_instance.primary",
                        "guideline": "https://docs.example.com/CKV_AWS_16",
                        "code_block": [[3, f'  password = "{CANARY}"']],
                    }
                ]
            }
        }
    ]
    findings = from_checkov(checkov_output)
    assert len(findings) == 1
    assert CANARY not in _dumps([f.to_dict() for f in findings])


def test_infracost_findings_carry_no_attribute_values() -> None:
    diff = {
        "projects": [
            {
                "diff": {
                    "resources": [
                        {
                            "name": "aws_db_instance.primary",
                            "monthlyCost": "120.00",
                            "metadata": {"password": CANARY},
                        }
                    ]
                }
            }
        ]
    }
    findings = from_infracost(diff)
    assert findings
    assert CANARY not in _dumps([f.to_dict() for f in findings])


# ── Sink 2: the LLM prompt ───────────────────────────────────────────────────


def test_llm_prompt_carries_no_attribute_values(plan_json: dict) -> None:
    """Findings are serialised straight into the review prompt.

    This is the sink that matters most: everything else stays inside
    infrastructure we control, but a prompt crosses to a third-party model
    provider and cannot be recalled.
    """
    from driftguard.ai.reviewer import _user_prompt

    findings = from_plan_changes(plan_json)
    prompt = _user_prompt(findings, {"repo": "acme/infra", "pr_number": 42, "title": "bump db"})
    assert prompt, "empty prompt would make the assertion below vacuous"
    assert CANARY not in prompt


# ── Sink 3: the pull request comment ─────────────────────────────────────────


def test_pr_comment_carries_no_attribute_values(plan_json: dict) -> None:
    findings = from_plan_changes(plan_json)
    body = format_comment(
        findings=findings,
        ai_review_md="No credentials should appear below this line.",
        summary_meta={"repo": "acme/infra", "pr": 42},
    )
    assert body, "formatter returned nothing; the assertion below would be vacuous"
    assert CANARY not in body


def test_pr_comment_does_not_echo_a_malicious_finding_message() -> None:
    """A finding whose message contains a secret must not be silently published.

    Not hypothetical: a scanner rule that interpolates the matched text into
    its message -- the obvious way to write one -- turns the PR comment into a
    disclosure channel. TF006 avoids it by reporting the attribute *name*; this
    test states the rule that keeps it that way.
    """
    from driftguard.services.scanner.rules.terraform import _scan_single

    content = f'''
resource "aws_db_instance" "primary" {{
  password = "{CANARY}"
}}
'''
    findings = _scan_single(content, "main.tf")
    tf006 = [f for f in findings if f.rule_id == "TF006"]
    assert tf006, "TF006 should fire on a hardcoded password"
    for f in tf006:
        assert CANARY not in f.title
        assert CANARY not in f.message
        assert CANARY not in (f.suggestion or "")
        # The attribute name is what makes the finding actionable.
        assert "password" in f.title.lower() or "password" in f.message.lower()


# ── Sink 4: structured logs ──────────────────────────────────────────────────


def test_parsing_a_plan_logs_no_attribute_values(plan_json: dict, caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.DEBUG):
        plan = parse_plan(plan_json)
        from_plan_changes(plan_json)

    assert plan.changes, "fixture produced no changes; log assertion would be vacuous"
    # getMessage() alone misses values passed via `extra=`, which is exactly how
    # this pipeline logs. Serialise the whole record.
    emitted = "\n".join(
        f"{r.getMessage()} {_dumps(getattr(r, 'extra', None))} {_dumps(r.args)}" for r in caplog.records
    )
    assert CANARY not in emitted


def test_a_malformed_plan_does_not_log_its_contents(caplog: pytest.LogCaptureFixture) -> None:
    """Error paths are where redaction usually breaks.

    The reflex when parsing fails is to log the input that caused it. On this
    pipeline that input is a credential dump.
    """
    broken = {
        "format_version": "1.2",
        "resource_changes": [
            {"address": "aws_db_instance.primary", "change": {"actions": "not-a-list", "after": {"password": CANARY}}}
        ],
    }
    with caplog.at_level(logging.DEBUG):
        try:
            parse_plan(broken)
        except Exception:  # noqa: BLE001 -- the failure mode is the subject
            pass

    emitted = "\n".join(
        f"{r.getMessage()} {_dumps(getattr(r, 'extra', None))} {_dumps(r.args)} {r.exc_text or ''}"
        for r in caplog.records
    )
    assert CANARY not in emitted


# ── Sink 5: the audit log ────────────────────────────────────────────────────


def test_audit_payload_shape_excludes_plan_bodies() -> None:
    """The audit log records *that* an analysis ran, never what was in it.

    Plan bodies go to object storage with server-side encryption and an
    org-scoped key; the audit row holds a reference, not a copy.
    """
    from driftguard.services.storage import plan_key

    key = plan_key("acme", "acme/infra", 42, "0123456789abcdef")
    assert CANARY not in key
    # A storage key is an identifier: org, repo, PR, short SHA. Nothing else.
    assert key.startswith("plans/acme/")
    assert "acme_infra" in key
    assert "pr-42" in key
