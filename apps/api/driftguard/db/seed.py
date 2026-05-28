"""Development seed — realistic demo data for DriftGuard dashboard."""

from __future__ import annotations

import asyncio
import random
import uuid
from datetime import UTC, datetime, timedelta

from driftguard.core.db import SessionLocal
from driftguard.db.models import (
    Analysis,
    DriftIncident,
    Finding,
    Organization,
    PullRequest,
    Repository,
    RuntimeEvent,
)

SEED_INSTALLATION_ID = 133548351  # matches the live Vercel test install


async def seed() -> None:
    async with SessionLocal() as db:
        # ── Org ──────────────────────────────────────────────────────────────
        from sqlalchemy import select

        existing = (
            await db.execute(select(Organization).where(Organization.github_installation_id == SEED_INSTALLATION_ID))
        ).scalar_one_or_none()

        if existing:
            org = existing
            print(f"org exists: {org.id}")
        else:
            org = Organization(
                id=str(uuid.uuid4()),
                github_installation_id=SEED_INSTALLATION_ID,
                plan="team",
                settings={"account_login": "UP2CLOUD", "account_avatar_url": "https://github.com/UP2CLOUD.png"},
            )
            db.add(org)
            await db.flush()
            print(f"created org: {org.id}")

        # ── Repos ─────────────────────────────────────────────────────────────
        repo_defs = [
            ("UP2CLOUD/driftguard", "main"),
            ("UP2CLOUD/infra-prod", "main"),
        ]
        repos = []
        for full_name, branch in repo_defs:
            existing_repo = (
                await db.execute(select(Repository).where(Repository.full_name == full_name))
            ).scalar_one_or_none()
            if existing_repo:
                repos.append(existing_repo)
            else:
                r = Repository(
                    id=str(uuid.uuid4()),
                    org_id=org.id,
                    github_repo_id=random.randint(100000, 999999),  # noqa: S311
                    full_name=full_name,
                    default_branch=branch,
                    enabled=True,
                )
                db.add(r)
                repos.append(r)
        await db.flush()

        # ── PRs + Analyses + Findings ─────────────────────────────────────────
        pr_data = [
            (
                repos[0],
                847,
                "a1b2c3d",
                84,
                "completed",
                [
                    (
                        "security",
                        "critical",
                        "aws_s3_bucket.tf-state",
                        "Public access block removed",
                        "Enable S3 Block Public Access",
                    ),
                    ("cost", "high", "aws_rds_cluster.prod", "+€480/mo — db.r5.large → db.r5.4xlarge", None),
                    (
                        "security",
                        "high",
                        "aws_security_group.web",
                        "Ingress 0.0.0.0/0 on port 22",
                        "Restrict to known CIDRs",
                    ),
                ],
            ),
            (
                repos[1],
                312,
                "e4f5a6b",
                31,
                "completed",
                [
                    ("cost", "low", "aws_lambda_function.api", "+€2/mo memory increase", None),
                ],
            ),
            (
                repos[0],
                843,
                "b7c8d9e",
                62,
                "completed",
                [
                    (
                        "drift",
                        "medium",
                        "aws_ec2.bastion",
                        "Instance terminated outside Terraform",
                        "Re-provision or remove from state",
                    ),
                    (
                        "security",
                        "high",
                        "aws_iam_policy.deploy-role",
                        "Wildcard resources in policy",
                        "Restrict to specific ARNs",
                    ),
                ],
            ),
        ]

        for repo, pr_num, sha, risk, status, findings_data in pr_data:
            existing_pr = (
                await db.execute(
                    select(PullRequest).where(
                        PullRequest.repo_id == repo.id,
                        PullRequest.github_pr_number == pr_num,
                    )
                )
            ).scalar_one_or_none()

            if existing_pr:
                continue

            pr = PullRequest(
                id=str(uuid.uuid4()),
                repo_id=repo.id,
                github_pr_number=pr_num,
                head_sha=sha,
            )
            db.add(pr)
            await db.flush()

            days_ago = random.randint(0, 7)  # noqa: S311
            analysis = Analysis(
                id=str(uuid.uuid4()),
                pr_id=pr.id,
                status=status,
                risk_score=risk,
                summary_md=f"AI review: {len(findings_data)} finding(s). Risk score {risk}/100.",
                created_at=datetime.now(UTC) - timedelta(days=days_ago),
            )
            db.add(analysis)
            await db.flush()

            for ftype, fsev, fresource, fmsg, ffix in findings_data:
                db.add(
                    Finding(
                        id=str(uuid.uuid4()),
                        analysis_id=analysis.id,
                        type=ftype,
                        severity=fsev,
                        resource=fresource,
                        message=fmsg,
                        suggestion=ffix,
                    )
                )

        # ── RuntimeEvents ──────────────────────────────────────────────────────
        event_defs = [
            ("pr_opened", "info", "github", "PR #847 opened by cursor-agent — 23 resource changes"),
            ("policy_blocked", "critical", "driftguard", "BLOCKED: aws_s3_bucket.tf-state public access removed"),
            ("drift_detected", "high", "driftguard", "aws_rds_cluster.prod — live state diverged from plan"),
            ("security_finding", "high", "checkov", "CKV_AWS_24: aws_security_group.web ingress 0.0.0.0/0"),
            ("cost_alert", "warn", "infracost", "+€480/mo delta on aws_rds_cluster.prod"),
            ("memory_recalled", "info", "driftguard", "2 similar past incidents recalled (sim 0.94, 0.87)"),
            ("pr_opened", "info", "github", "PR #843 opened by devin-agent — 5 resource changes"),
            ("policy_blocked", "high", "driftguard", "WARNED: aws_iam_policy.deploy-role wildcard resources"),
        ]

        for i, (etype, esev, esrc, emsg) in enumerate(event_defs):
            db.add(
                RuntimeEvent(
                    id=str(uuid.uuid4()),
                    org_id=org.id,
                    repo_id=repos[0].id if i % 2 == 0 else repos[1].id,
                    event_type=etype,
                    severity=esev,
                    source=esrc,
                    message=emsg,
                    created_at=datetime.now(UTC) - timedelta(hours=i * 3),
                )
            )

        # ── DriftIncidents ──────────────────────────────────────────────────────
        incident_defs = [
            (
                "S3 public access block removed",
                "critical",
                "open",
                "Public access block was disabled on terraform state bucket.",
                "Enable S3 Block Public Access on all buckets.",
                1,
            ),
            (
                "RDS cluster manual resize",
                "high",
                "open",
                "db.r5.large was resized to db.r5.4xlarge via AWS Console, not Terraform.",
                "Import the new instance type into Terraform state.",
                3,
            ),
            (
                "IAM wildcard policy",
                "high",
                "investigating",
                "Deploy role has wildcard resource permissions.",
                "Restrict to specific ARNs.",
                2,
            ),
            (
                "EC2 instance terminated outside Terraform",
                "medium",
                "resolved",
                "Bastion instance was terminated without removing from state.",
                "Run terraform destroy for the resource or remove from state.",
                1,
            ),
        ]

        for title, sev, status, root, fix, recurrence in incident_defs:
            db.add(
                DriftIncident(
                    id=str(uuid.uuid4()),
                    org_id=org.id,
                    repo_id=repos[0].id,
                    title=title,
                    severity=sev,
                    status=status,
                    root_cause=root,
                    suggested_fix=fix,
                    recurrence_count=recurrence,
                    first_seen_at=datetime.now(UTC) - timedelta(days=random.randint(1, 14)),  # noqa: S311
                    last_seen_at=datetime.now(UTC) - timedelta(hours=random.randint(1, 48)),  # noqa: S311
                )
            )

        # ── Default policy templates ──────────────────────────────────────────
        from sqlalchemy import select as _select

        from driftguard.db.models import PolicyRule

        existing_policies = (await db.execute(_select(PolicyRule).where(PolicyRule.org_id == org.id))).scalars().all()

        if not existing_policies:
            policy_templates = [
                PolicyRule(
                    org_id=org.id,
                    name="Block public S3 buckets",
                    description="Block any change that removes S3 public access protection.",
                    rule_type="block",
                    severity="critical",
                    enabled=True,
                    conditions={"event_type": "security_finding", "message_contains": "public"},
                    actions={"block_merge": True, "create_incident": True},
                ),
                PolicyRule(
                    org_id=org.id,
                    name="Warn on RDS resize",
                    description="Warn when a production RDS instance class is changed.",
                    rule_type="warn",
                    severity="high",
                    enabled=True,
                    conditions={"event_type": "drift_detected", "message_contains": "rds"},
                    actions={"create_incident": True},
                ),
                PolicyRule(
                    org_id=org.id,
                    name="Block IAM wildcard resources",
                    description="Block IAM policies that grant wildcard resource access.",
                    rule_type="block",
                    severity="critical",
                    enabled=True,
                    conditions={"event_type": "security_finding", "message_contains": "wildcard"},
                    actions={"block_merge": True, "create_incident": True},
                ),
                PolicyRule(
                    org_id=org.id,
                    name="Alert on cost spike > €200/mo",
                    description="Alert when a PR introduces more than €200/mo in new spend.",
                    rule_type="alert",
                    severity="high",
                    enabled=True,
                    conditions={"event_type": "cost_alert"},
                    actions={"notify_email": True},
                ),
            ]
            for p in policy_templates:
                db.add(p)
            print(f"✓ seeded {len(policy_templates)} policy templates")

        await db.commit()
        print("✓ seed complete")


if __name__ == "__main__":
    asyncio.run(seed())
