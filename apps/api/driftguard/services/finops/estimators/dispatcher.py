from __future__ import annotations

from ..parsers.terraform_diff import ResourceChange
from . import aws, azure, gcp


def estimate_cost(rc: ResourceChange) -> int:
    """Dispatch to the right provider estimator. Returns monthly cents."""
    if rc.provider == "aws":
        return aws.estimate(rc)
    if rc.provider == "google":
        return gcp.estimate(rc)
    if rc.provider == "azurerm":
        return azure.estimate(rc)
    return 0
