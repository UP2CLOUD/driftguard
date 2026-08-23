"""Debug routes must not exist on a production deployment.

`/debug/run-migrations` shells out to `alembic upgrade head`.
`/debug/run-analyze` returns a raw traceback. `/debug/schema` dumps the
schema and row counts. None of these should be reachable in production, and
"reachable but returns 404 without the right header" is a weaker guarantee
than it appears -- it still depends on a token staying secret, on the
dependency surviving every refactor, and on middleware ordering.

So the property under test is absence, not rejection: in prod the routes are
not registered at all, which also keeps them out of the OpenAPI schema.

The router is built at import time from `settings.environment`, so each test
re-imports the module tree under a patched environment. That is the same thing
a real deployment does -- it reads the environment once, at boot.
"""

from __future__ import annotations

import importlib

import pytest


def _routes_for_environment(monkeypatch: pytest.MonkeyPatch, environment: str) -> list[str]:
    """Rebuild the v1 router under `environment` and return its route paths."""
    import driftguard.api.v1 as v1
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "environment", environment)
    # api.v1.__init__ decides what to mount at import time; the health module
    # is re-imported first so its routers are rebuilt from scratch too.
    import driftguard.api.v1.health as health

    importlib.reload(health)
    reloaded = importlib.reload(v1)
    return [getattr(r, "path", "") for r in reloaded.router.routes]


DEBUG_PATHS = [
    "/debug/run-analyze",
    "/debug/analyze-steps",
    "/debug/run-migrations",
    "/debug/schema",
]


@pytest.fixture(autouse=True)
def _restore_router_afterwards():
    """Leave the module tree as we found it.

    Without this, a reload performed under ENVIRONMENT=prod would persist and
    silently strip the debug routes for every test that ran afterwards.
    """
    yield
    import driftguard.api.v1 as v1
    import driftguard.api.v1.health as health

    importlib.reload(health)
    importlib.reload(v1)


def test_debug_routes_absent_in_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    paths = _routes_for_environment(monkeypatch, "prod")
    for debug_path in DEBUG_PATHS:
        assert debug_path not in paths, f"{debug_path} is registered in production"


def test_health_routes_still_present_in_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    """Guards against the obvious over-correction: dropping the whole router.

    Without this, a change that mounted nothing at all would pass the test
    above while taking down the liveness probe.
    """
    paths = _routes_for_environment(monkeypatch, "prod")
    assert "/health" in paths
    assert "/ready" in paths


def test_debug_routes_present_outside_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    """They still have to work where they are useful, or nobody will keep them."""
    paths = _routes_for_environment(monkeypatch, "dev")
    for debug_path in DEBUG_PATHS:
        assert debug_path in paths, f"{debug_path} missing in dev"


def test_debug_routes_absent_from_openapi_schema_in_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    """Absence must hold for the published schema too.

    A route listed in OpenAPI is a route advertised to every reader of the
    schema, which is how debug surface gets discovered in the first place.
    """
    _routes_for_environment(monkeypatch, "prod")

    from fastapi import FastAPI

    import driftguard.api.v1 as v1

    app = FastAPI()
    app.include_router(v1.router, prefix="/api/v1")
    schema_paths = app.openapi()["paths"].keys()

    for debug_path in DEBUG_PATHS:
        assert f"/api/v1{debug_path}" not in schema_paths


def test_debug_token_still_gates_non_prod_environments(monkeypatch: pytest.MonkeyPatch) -> None:
    """Staging is not public, but it is reachable by more people than prod.

    Where the routes do exist, a configured DEBUG_ENDPOINT_TOKEN must still be
    required -- and a mismatch must look like a missing route, not like a
    guarded one.
    """
    from fastapi import HTTPException

    from driftguard.api.v1.health import require_debug_access
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "debug_endpoint_token", "s3kr1t")

    with pytest.raises(HTTPException) as exc:
        require_debug_access(x_debug_token="wrong")
    assert exc.value.status_code == 404

    with pytest.raises(HTTPException):
        require_debug_access(x_debug_token=None)

    # Correct token: no exception.
    require_debug_access(x_debug_token="s3kr1t")


def test_debug_access_is_open_when_no_token_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    """Dev with no token set must stay usable; that is the whole point of dev."""
    from driftguard.api.v1.health import require_debug_access
    from driftguard.core.config import settings

    monkeypatch.setattr(settings, "debug_endpoint_token", "")
    require_debug_access(x_debug_token=None)
