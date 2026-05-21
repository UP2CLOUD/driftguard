from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from driftguard.core.config import settings

security = HTTPBearer()


def require_internal_auth(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    if credentials.credentials != settings.secret_key:
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing internal API secret",
        )
    return credentials.credentials
