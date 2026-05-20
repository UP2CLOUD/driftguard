"""Object storage — Cloudflare R2 (S3-compat) via boto3.

Plans, tarballs, and evidence packs stored in R2 (no egress fees).
Falls back to local /tmp in dev if R2 not configured.
"""
from __future__ import annotations

import os
import tempfile
from pathlib import Path
from typing import BinaryIO

import boto3
import structlog
from botocore.config import Config

from driftguard.core.config import settings

log = structlog.get_logger(__name__)

_s3 = None


def _client():
    global _s3
    if _s3 is None:
        if settings.s3_endpoint:
            _s3 = boto3.client(
                "s3",
                endpoint_url=settings.s3_endpoint,
                aws_access_key_id=settings.s3_access_key,
                aws_secret_access_key=settings.s3_secret_key,
                region_name="auto",
                config=Config(signature_version="s3v4"),
            )
        else:
            # dev: standard AWS S3 / local fallback
            _s3 = boto3.client("s3")
    return _s3


def _bucket() -> str:
    return settings.s3_bucket or "driftguard-plans"


# ── Upload ─────────────────────────────────────────────────────────────────

def upload_plan(key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
    """Upload bytes and return the object key."""
    if not settings.s3_endpoint and not settings.s3_bucket:
        return _dev_write(key, data)
    try:
        _client().put_object(
            Bucket=_bucket(),
            Key=key,
            Body=data,
            ContentType=content_type,
            ServerSideEncryption="AES256",
        )
        log.info("storage.upload.ok", key=key, size=len(data))
        return key
    except Exception as exc:
        log.error("storage.upload.failed", key=key, error=str(exc))
        raise


def download_plan(key: str) -> bytes:
    if not settings.s3_endpoint and not settings.s3_bucket:
        return _dev_read(key)
    obj = _client().get_object(Bucket=_bucket(), Key=key)
    return obj["Body"].read()


def plan_key(org_id: str, repo: str, pr: int, sha: str) -> str:
    safe_repo = repo.replace("/", "_")
    return f"plans/{org_id}/{safe_repo}/pr-{pr}/{sha[:12]}.tar.gz"


def evidence_key(org_id: str, analysis_id: str) -> str:
    return f"evidence/{org_id}/{analysis_id}/pack.zip"


# ── Dev fallback ───────────────────────────────────────────────────────────

def _dev_write(key: str, data: bytes) -> str:
    path = Path(tempfile.gettempdir()) / "driftguard_dev" / key
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return key


def _dev_read(key: str) -> bytes:
    path = Path(tempfile.gettempdir()) / "driftguard_dev" / key
    return path.read_bytes()
