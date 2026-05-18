from unittest.mock import MagicMock, patch

from driftguard.integrations.aws import AWSCredentials


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
