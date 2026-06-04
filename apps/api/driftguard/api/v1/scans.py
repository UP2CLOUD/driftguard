"""
Manual scan API — trigger a static IaC scan without GitHub webhook.

This endpoint allows:
  1. Uploading a tar.gz of IaC files and scanning them in-process
  2. Triggering a scan of a known repository by installation_id + repo name
  3. Re-running a previous scan

No terraform binary, checkov, or AWS credentials required for static scan.
"""

from __future__ import annotations

import hashlib
import io
import tarfile
import tempfile
import time
from datetime import UTC
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from driftguard.core.db import get_db
from driftguard.core.logging import log
from driftguard.db.models import Analysis, AuditLog, Organization, PullRequest, Repository
from driftguard.db.models import Finding as FindingModel
from driftguard.services.analysis.ai_review import run_ai_review
from driftguard.services.scanner.engine import ScanResult, scan_directory

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanFindingOut(BaseModel):
    rule_id: str
    severity: str
    category: str
    title: str
    message: str
    file: str
    line: int | None
    resource: str | None
    suggestion: str | None
    controls: list[str]


class ScanResultOut(BaseModel):
    scan_id: str
    status: Literal["completed", "failed", "empty"]
    risk_score: int
    files_scanned: int
    tf_files: int
    k8s_files: int
    gha_files: int
    critical: int
    high: int
    medium: int
    low: int
    findings: list[ScanFindingOut]
    errors: list[str]
    duration_ms: int
    # Optional — set when linked to a DB analysis
    analysis_id: str | None = None
    ai_summary: str | None = None


class TriggerScanRequest(BaseModel):
    installation_id: int
    repo_full_name: str
    ref: str = "main"


@router.post(
    "/upload",
    response_model=ScanResultOut,
    status_code=200,
    summary="Scan uploaded IaC files",
    description="Upload a tar.gz archive of Terraform/Kubernetes/GHA files and get findings immediately.",
)
async def scan_upload(
    file: UploadFile = File(..., description="tar.gz archive of IaC files"),
    installation_id: int = Form(...),
    db: AsyncSession = Depends(get_db),
) -> ScanResultOut:
    """
    POST /api/v1/scans/upload
    Content-Type: multipart/form-data

    Accepts a .tar.gz archive, extracts to a temp dir, runs static scanner.
    Results persisted to DB as Analysis + Findings.
    """
    if not file.filename or not file.filename.endswith((".tar.gz", ".tgz")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a .tar.gz archive",
        )

    # Resolve org
    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == installation_id))
    ).scalar_one_or_none()

    if not org:
        raise HTTPException(404, f"Installation {installation_id} not found")

    content = await file.read()
    if len(content) > 50 * 1024 * 1024:  # 50MB limit
        raise HTTPException(413, "Archive too large (max 50MB)")

    started = time.monotonic()

    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        try:
            with tarfile.open(fileobj=io.BytesIO(content), mode="r:gz") as tf:
                # Security: only extract safe paths
                safe_members = [m for m in tf.getmembers() if not m.name.startswith("/") and ".." not in m.name]
                tf.extractall(root, members=safe_members)  # noqa: S202
        except Exception as exc:
            raise HTTPException(400, f"Could not extract archive: {exc}") from exc

        result: ScanResult = await scan_directory(root)

    # Phase 5: AI review layer (grounded on scanner output, optional)
    try:
        ai_review = await run_ai_review(result, context={"repo": file.filename, "ref": "upload"})
    except Exception:

        class _FallbackReview:
            narrative = "_AI review unavailable._"

        ai_review = _FallbackReview()

    duration_ms = int((time.monotonic() - started) * 1000)

    # Persist to DB (with AI summary)
    analysis_id = await _persist_scan(
        db=db,
        org_id=org.id,
        result=result,
        source="manual_upload",
        ref=file.filename,
        ai_summary=ai_review.narrative,
    )

    resp = _to_response(result, duration_ms, analysis_id)
    resp.ai_summary = ai_review.narrative
    return resp


@router.post(
    "/trigger",
    response_model=dict,
    status_code=202,
    summary="Trigger background scan of a GitHub repo",
)
async def trigger_scan(
    body: TriggerScanRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Enqueue a background scan of a GitHub repo.
    When celery_enabled=True: returns immediately with task_id.
    When celery_enabled=False: runs in-process and returns results.
    """
    from driftguard.core.config import settings

    org = (
        await db.execute(select(Organization).where(Organization.github_installation_id == body.installation_id))
    ).scalar_one_or_none()
    if not org:
        raise HTTPException(404, "Installation not found")

    if settings.celery_enabled:
        try:
            from driftguard.worker.tasks import run_manual_scan

            task = run_manual_scan.delay(
                installation_id=body.installation_id,
                repo_full_name=body.repo_full_name,
                ref=body.ref,
            )
            return {
                "status": "queued",
                "task_id": task.id,
                "message": f"Scan queued for {body.repo_full_name}@{body.ref}",
            }
        except Exception as exc:
            log.warning("scan.trigger.failed", extra={"error": str(exc)})
            raise HTTPException(500, "Failed to queue scan") from exc

    # In-process scan (no Celery/Redis required)
    try:
        result = await _run_scan_inprocess(
            db=db,
            org_id=org.id,
            installation_id=body.installation_id,
            repo_full_name=body.repo_full_name,
            ref=body.ref,
        )
        return result
    except HTTPException:
        raise
    except Exception as exc:
        log.warning("scan.trigger.inprocess.failed", extra={"error": str(exc)})
        raise HTTPException(500, f"Scan failed: {exc}") from exc


async def _run_scan_inprocess(
    *,
    db: AsyncSession,
    org_id: str,
    installation_id: int,
    repo_full_name: str,
    ref: str,
) -> dict:
    import io
    import tarfile
    import tempfile
    from pathlib import Path

    import httpx

    from driftguard.services.scanner.engine import scan_directory

    try:
        from driftguard.integrations.github import installation_token, tarball_url

        token = await installation_token(installation_id)
        url = tarball_url(repo_full_name, ref)
    except Exception:
        url = f"https://api.github.com/repos/{repo_full_name}/tarball/{ref}"
        token = None

    headers = {"Accept": "application/vnd.github+json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        resp = await client.get(url, headers=headers)
        if resp.status_code == 404:
            raise HTTPException(404, f"Repository {repo_full_name}@{ref} not found or not accessible")
        resp.raise_for_status()
        archive = resp.content

    with tempfile.TemporaryDirectory() as tmpdir:
        root = Path(tmpdir)
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:gz") as tf:
            safe = [m for m in tf.getmembers() if not m.name.startswith("/") and ".." not in m.name]
            tf.extractall(root, members=safe)  # noqa: S202
        subdirs = [d for d in root.iterdir() if d.is_dir()]
        scan_root = subdirs[0] if len(subdirs) == 1 else root
        result = await scan_directory(scan_root)

    analysis_id = await _persist_scan(
        db=db,
        org_id=org_id,
        result=result,
        source=f"{repo_full_name}@{ref}",
        ref=ref,
    )
    return {
        "status": "completed",
        "task_id": analysis_id,
        "analysis_id": analysis_id,
        "risk_score": result.risk_score,
        "findings": len(result.findings),
        "message": f"Scan completed for {repo_full_name}@{ref}",
    }


@router.get(
    "/{analysis_id}",
    response_model=ScanResultOut,
    summary="Get scan results by analysis ID",
)
async def get_scan(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
) -> ScanResultOut:
    """Retrieve a completed scan result."""
    analysis = (await db.execute(select(Analysis).where(Analysis.id == analysis_id))).scalar_one_or_none()
    if not analysis:
        raise HTTPException(404, "Scan not found")

    findings_rows = (
        (await db.execute(select(FindingModel).where(FindingModel.analysis_id == analysis_id))).scalars().all()
    )

    findings_out = [
        ScanFindingOut(
            rule_id=f.rule_id or "UNKNOWN",
            severity=f.severity,
            category="general",
            title=f.message[:80],
            message=f.message,
            file=f.resource_address,
            line=None,
            resource=f.resource_address,
            suggestion=f.suggestion,
            controls=[],
        )
        for f in findings_rows
    ]

    return ScanResultOut(
        scan_id=analysis.id,
        status=analysis.status,
        risk_score=analysis.risk_score or 0,
        files_scanned=0,
        tf_files=0,
        k8s_files=0,
        gha_files=0,
        critical=sum(1 for f in findings_out if f.severity == "critical"),
        high=sum(1 for f in findings_out if f.severity == "high"),
        medium=sum(1 for f in findings_out if f.severity == "medium"),
        low=sum(1 for f in findings_out if f.severity == "low"),
        findings=findings_out,
        errors=[],
        duration_ms=0,
        analysis_id=analysis_id,
    )


async def _persist_scan(
    db: AsyncSession,
    org_id: str,
    result: ScanResult,
    source: str,
    ref: str,
    ai_summary: str | None = None,
) -> str:
    """Persist scan results to DB. Returns analysis_id."""
    from datetime import datetime

    now = datetime.now(UTC)

    # Find or create a placeholder repository
    repo = (
        await db.execute(
            select(Repository).where(
                Repository.org_id == org_id,
                Repository.full_name == f"manual/{source}",
            )
        )
    ).scalar_one_or_none()

    if not repo:
        repo = Repository(
            org_id=org_id,
            github_repo_id=abs(hash(f"{org_id}:{source}")) % (2**31),
            full_name=f"manual/{source}",
            default_branch="main",
        )
        db.add(repo)
        await db.flush()

    # Create a placeholder PR
    pr = PullRequest(
        repo_id=repo.id,
        github_pr_number=0,
        head_sha=hashlib.sha256(f"{source}:{now.isoformat()}".encode()).hexdigest()[:40],
        base_sha="0" * 40,
        status="manual",
    )
    db.add(pr)
    await db.flush()

    # Create analysis
    analysis = Analysis(
        pr_id=pr.id,
        status="completed" if not result.errors else "failed",
        started_at=now,
        finished_at=now,
        risk_score=result.risk_score,
        summary_md=ai_summary,
    )
    db.add(analysis)
    await db.flush()

    # Persist findings
    for finding in result.findings:
        db_finding = FindingModel(
            analysis_id=analysis.id,
            type=str(finding.category.value),
            severity=str(finding.severity.value),
            resource_address=finding.resource or finding.file,
            message=finding.message,
            suggestion=finding.suggestion,
            rule_id=finding.rule_id,
        )
        db.add(db_finding)

    # Audit log
    db.add(
        AuditLog(
            org_id=org_id,
            actor="system",
            action="scan.completed",
            target=source,
            payload={"risk_score": result.risk_score, "findings": len(result.findings), "source": source},
        )
    )

    await db.commit()
    return analysis.id


def _to_response(result: ScanResult, duration_ms: int, analysis_id: str | None) -> ScanResultOut:
    return ScanResultOut(
        scan_id=analysis_id or "local",
        status="completed" if not result.errors else "failed",
        risk_score=result.risk_score,
        files_scanned=result.files_scanned,
        tf_files=result.tf_files,
        k8s_files=result.k8s_files,
        gha_files=result.gha_files,
        critical=result.critical,
        high=result.high,
        medium=result.medium,
        low=result.low,
        findings=[
            ScanFindingOut(
                rule_id=f.rule_id,
                severity=str(f.severity.value),
                category=str(f.category.value),
                title=f.title,
                message=f.message,
                file=f.file,
                line=f.line,
                resource=f.resource,
                suggestion=f.suggestion,
                controls=f.controls,
            )
            for f in result.findings
        ],
        errors=result.errors,
        duration_ms=duration_ms,
        analysis_id=analysis_id,
        ai_summary=None,
    )
