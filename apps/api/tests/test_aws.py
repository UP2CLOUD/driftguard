from unittest.mock import AsyncMock, MagicMock, patch

from fastapi.testclient import TestClient

from driftguard.core.db import get_db, get_session
from driftguard.db.models import Organization, Repository
from driftguard.integrations.aws import AWSCredentials
from driftguard.main import app

AUTH = {"Authorization": "Bearer dev-only-change-me"}


def _override(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_db] = _dep


def _override_session(session) -> None:
    async def _dep():
        yield session

    app.dependency_overrides[get_session] = _dep


def _cleanup() -> None:
    app.dependency_overrides.pop(get_db, None)
    app.dependency_overrides.pop(get_session, None)


def test_aws_credentials_as_env():
    creds = AWSCredentials(
        access_key="AKIA123",
        secret_key="secret",
        session_token="token",
        region="eu-west-1",
    )
    env = creds.as_env()
    assert env["AWS_ACCESS_KEY_ID"] == "AKIA123"
    assert env["AWS_SECRET_ACCESS_KEY"] == "secret"
    assert env["AWS_SESSION_TOKEN"] == "token"
    assert env["AWS_DEFAULT_REGION"] == "eu-west-1"


def test_assume_role_success():
    mock_resp = {
        "Credentials": {
            "AccessKeyId": "ASIA123",
            "SecretAccessKey": "secret",
            "SessionToken": "token",
        }
    }
    with patch("boto3.client") as mock_client:
        mock_sts = MagicMock()
        mock_sts.assume_role.return_value = mock_resp
        mock_client.return_value = mock_sts

        from driftguard.integrations.aws import assume_role

        creds = assume_role("arn:aws:iam::123456789:role/driftguard-readonly")

    assert creds.access_key == "ASIA123"
    assert creds.region == "eu-west-1"


def test_assume_role_failure():
    from botocore.exceptions import ClientError

    with patch("boto3.client") as mock_client:
        mock_sts = MagicMock()
        mock_sts.assume_role.side_effect = ClientError(
            {"Error": {"Code": "AccessDenied", "Message": "denied"}}, "AssumeRole"
        )
        mock_client.return_value = mock_sts

        from driftguard.integrations.aws import assume_role

        try:
            assume_role("arn:aws:iam::123456789:role/bad-role")
            raise AssertionError("should raise")
        except PermissionError:
            pass


# ── GET /aws/verify ────────────────────────────────────────────────────────────


class TestVerifyAwsConnection:
    def test_requires_auth(self):
        r = TestClient(app).get("/api/v1/aws/verify?org_id=org-1")
        assert r.status_code == 401

    def test_not_found_returns_404(self):
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=None)
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/aws/verify?org_id=nonexistent", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_no_role_arn_returns_not_configured(self):
        org = Organization(id="org-1", github_installation_id=42, plan="free", settings={})
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        _override(mock)
        try:
            r = TestClient(app).get("/api/v1/aws/verify?org_id=org-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["configured"] is False
            assert "error" in data
        finally:
            _cleanup()

    def test_valid_role_returns_account_id(self):
        org = Organization(
            id="org-1",
            github_installation_id=42,
            plan="free",
            settings={"aws_role_arn": "arn:aws:iam::123456789012:role/DriftGuard"},
        )
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        _override(mock)
        try:
            fake_identity = {
                "account_id": "123456789012",
                "arn": "arn:aws:sts::123456789012:assumed-role/DriftGuard/driftguard",
                "region": "eu-west-1",
            }
            with patch("driftguard.integrations.aws.validate_role", return_value=fake_identity):
                r = TestClient(app).get("/api/v1/aws/verify?org_id=org-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["configured"] is True
            assert data["valid"] is True
            assert data["account_id"] == "123456789012"
            assert data["role_arn"] == "arn:aws:iam::123456789012:role/DriftGuard"
        finally:
            _cleanup()

    def test_invalid_role_returns_valid_false(self):
        org = Organization(
            id="org-1",
            github_installation_id=42,
            plan="free",
            settings={"aws_role_arn": "arn:aws:iam::123456789012:role/BadRole"},
        )
        mock = AsyncMock()
        mock.get = AsyncMock(return_value=org)
        _override(mock)
        try:
            with patch(
                "driftguard.integrations.aws.assume_role",
                side_effect=PermissionError("AssumeRole failed"),
            ):
                r = TestClient(app).get("/api/v1/aws/verify?org_id=org-1", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["configured"] is True
            assert data["valid"] is False
            assert "error" in data
        finally:
            _cleanup()


# ── POST /aws/repos/{repo_id}/configure ───────────────────────────────────────


def _repo(settings: dict | None = None) -> Repository:
    return Repository(
        id="repo-1",
        org_id="org-1",
        github_repo_id=42,
        full_name="acme/infra",
        default_branch="main",
        enabled=True,
        settings=settings,
    )


def _mock_repo_session(repo=None) -> AsyncMock:
    mock = AsyncMock()
    mock.execute = AsyncMock(return_value=MagicMock(scalar_one_or_none=MagicMock(return_value=repo)))
    mock.commit = AsyncMock()
    return mock


class TestConfigureAws:
    def test_requires_auth(self):
        r = TestClient(app).post(
            "/api/v1/aws/repos/repo-1/configure",
            json={"aws_role_arn": "arn:aws:iam::123456789012:role/DG"},
        )
        assert r.status_code == 401

    def test_not_found_returns_404(self):
        _override_session(_mock_repo_session(repo=None))
        try:
            r = TestClient(app).post(
                "/api/v1/aws/repos/nonexistent/configure",
                json={"aws_role_arn": "arn:aws:iam::123456789012:role/DG"},
                headers=AUTH,
            )
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_saves_aws_config(self):
        repo = _repo()
        _override_session(_mock_repo_session(repo=repo))
        try:
            r = TestClient(app).post(
                "/api/v1/aws/repos/repo-1/configure",
                json={
                    "aws_role_arn": "arn:aws:iam::123456789012:role/DG",
                    "aws_region": "us-east-1",
                    "state_bucket": "my-tfstate",
                },
                headers=AUTH,
            )
            assert r.status_code == 200
            assert r.json() == {"status": "saved"}
            assert repo.settings["aws_role_arn"] == "arn:aws:iam::123456789012:role/DG"
            assert repo.settings["aws_region"] == "us-east-1"
            assert repo.settings["state_bucket"] == "my-tfstate"
        finally:
            _cleanup()


# ── POST /aws/repos/{repo_id}/validate ────────────────────────────────────────


class TestValidateAws:
    def test_requires_auth(self):
        r = TestClient(app).post("/api/v1/aws/repos/repo-1/validate")
        assert r.status_code == 401

    def test_not_found_returns_404(self):
        _override_session(_mock_repo_session(repo=None))
        try:
            r = TestClient(app).post("/api/v1/aws/repos/nonexistent/validate", headers=AUTH)
            assert r.status_code == 404
        finally:
            _cleanup()

    def test_no_role_arn_returns_invalid(self):
        _override_session(_mock_repo_session(repo=_repo(settings={})))
        try:
            r = TestClient(app).post("/api/v1/aws/repos/repo-1/validate", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["valid"] is False
            assert "aws_role_arn" in data["error"]
        finally:
            _cleanup()

    def test_valid_role_returns_account_id(self):
        repo = _repo(settings={"aws_role_arn": "arn:aws:iam::123456789012:role/DG"})
        _override_session(_mock_repo_session(repo=repo))
        fake_identity = {"account_id": "123456789012", "arn": "arn:aws:sts::123456789012:assumed-role/DG/s"}
        try:
            with patch("driftguard.integrations.aws.validate_role", return_value=fake_identity):
                r = TestClient(app).post("/api/v1/aws/repos/repo-1/validate", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["valid"] is True
            assert data["account_id"] == "123456789012"
        finally:
            _cleanup()

    def test_permission_error_returns_invalid(self):
        repo = _repo(settings={"aws_role_arn": "arn:aws:iam::123456789012:role/BadRole"})
        _override_session(_mock_repo_session(repo=repo))
        try:
            with patch("driftguard.integrations.aws.validate_role", side_effect=PermissionError("denied")):
                r = TestClient(app).post("/api/v1/aws/repos/repo-1/validate", headers=AUTH)
            assert r.status_code == 200
            data = r.json()
            assert data["valid"] is False
            assert "denied" in data["error"]
        finally:
            _cleanup()
