import boto3
from botocore.exceptions import ClientError


class AWSCredentials:
    def __init__(self, access_key: str, secret_key: str, session_token: str, region: str):
        self.access_key = access_key
        self.secret_key = secret_key
        self.session_token = session_token
        self.region = region

    def as_env(self) -> dict[str, str]:
        return {
            "AWS_ACCESS_KEY_ID": self.access_key,
            "AWS_SECRET_ACCESS_KEY": self.secret_key,
            "AWS_SESSION_TOKEN": self.session_token,
            "AWS_DEFAULT_REGION": self.region,
        }


def assume_role(role_arn: str, region: str = "eu-west-1", session_name: str = "driftguard") -> AWSCredentials:
    """Assume a customer IAM role and return temporary credentials.

    Customer must create this role with:
    - Trust policy allowing sts:AssumeRole from Driftguard's AWS account
    - ReadOnlyAccess + sts:GetCallerIdentity permissions
    """
    try:
        sts = boto3.client("sts", region_name=region)
        resp = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName=session_name,
            DurationSeconds=3600,
        )
        creds = resp["Credentials"]
        return AWSCredentials(
            access_key=creds["AccessKeyId"],
            secret_key=creds["SecretAccessKey"],
            session_token=creds["SessionToken"],
            region=region,
        )
    except ClientError as exc:
        raise PermissionError(f"AssumeRole failed for {role_arn}: {exc}") from exc


def validate_role(role_arn: str, region: str = "eu-west-1") -> dict:
    """Verify we can assume the role and return caller identity."""
    creds = assume_role(role_arn, region)
    sts = boto3.client(
        "sts",
        region_name=region,
        aws_access_key_id=creds.access_key,
        aws_secret_access_key=creds.secret_key,
        aws_session_token=creds.session_token,
    )
    identity = sts.get_caller_identity()
    return {
        "account_id": identity["Account"],
        "arn": identity["Arn"],
        "region": region,
    }
