import secrets
import time

import jwt

from driftguard.core.config import settings


def generate_installation_token(installation_id: int, org_id: str, ttl_days: int = 30) -> str:
    """Generate a signed JWT for a GitHub App installation."""
    payload = {
        "installation_id": installation_id,
        "org_id": org_id,
        "iat": int(time.time()),
        "exp": int(time.time()) + (ttl_days * 86400),
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


def verify_installation_token(token: str) -> dict | None:
    """Verify and decode an installation token. Returns payload or None."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload
    except jwt.InvalidTokenError:
        return None


def generate_api_key(org_id: str) -> str:
    """Generate a random API key for programmatic access."""
    return f"dg_{secrets.token_urlsafe(32)}"
