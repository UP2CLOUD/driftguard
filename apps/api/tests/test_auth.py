from driftguard.services.auth import (
    generate_api_key,
    generate_installation_token,
    verify_installation_token,
)


def test_generate_and_verify_token():
    token = generate_installation_token(installation_id=999, org_id="org_abc123")
    assert token.count(".") == 2

    payload = verify_installation_token(token)
    assert payload is not None
    assert payload["installation_id"] == 999
    assert payload["org_id"] == "org_abc123"
    assert "iat" in payload
    assert "exp" in payload


def test_verify_invalid_token():
    result = verify_installation_token("invalid.token.here")
    assert result is None


def test_verify_expired_token():
    token = generate_installation_token(installation_id=111, org_id="x", ttl_days=-1)
    result = verify_installation_token(token)
    assert result is None


def test_generate_api_key():
    key1 = generate_api_key("org_1")
    key2 = generate_api_key("org_1")
    assert key1.startswith("dg_")
    assert key2.startswith("dg_")
    assert key1 != key2
    assert len(key1) > 20
