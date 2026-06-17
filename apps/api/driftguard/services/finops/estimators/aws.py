from __future__ import annotations

from ..parsers.terraform_diff import ResourceChange
from ..pricing import aws as pricing

_AWS_RESOURCE_TYPES = {
    "aws_instance",
    "aws_launch_template",
    "aws_autoscaling_group",
    "aws_db_instance",
    "aws_rds_cluster",
    "aws_nat_gateway",
    "aws_ebs_volume",
    "aws_eks_cluster",
    "aws_eks_node_group",
    "aws_s3_bucket",
    "aws_lb",
    "aws_alb",
    "aws_cloudfront_distribution",
    "aws_elasticache_cluster",
    "aws_lambda_function",
}


def estimate(rc: ResourceChange) -> int:
    """Return estimated monthly cost in cents for an AWS resource change."""
    if rc.resource_type not in _AWS_RESOURCE_TYPES:
        return 0
    a = rc.attributes

    if rc.resource_type == "aws_instance":
        itype = a.get("instance_type", "t3.micro")
        return pricing.ec2_monthly_cents(str(itype))

    if rc.resource_type == "aws_launch_template":
        itype = a.get("instance_type", "t3.micro")
        return pricing.ec2_monthly_cents(str(itype))

    if rc.resource_type == "aws_autoscaling_group":
        desired = int(a.get("desired_capacity", a.get("min_size", 1)))
        itype = a.get("instance_type", "t3.micro")
        return pricing.ec2_monthly_cents(str(itype)) * desired

    if rc.resource_type in ("aws_db_instance",):
        cls = a.get("db_instance_class", "db.t3.micro")
        storage = int(a.get("allocated_storage", 20))
        return pricing.rds_monthly_cents(str(cls), storage)

    if rc.resource_type == "aws_rds_cluster":
        # Aurora serverless — flat estimate; real cost depends on ACUs
        return 5000  # $50/mo base estimate

    if rc.resource_type == "aws_nat_gateway":
        return pricing.NAT_GATEWAY_MONTHLY_CENTS

    if rc.resource_type == "aws_ebs_volume":
        vtype = a.get("volume_type", "gp3")
        size = int(a.get("volume_size", a.get("disk_size_gb", 8)))
        return pricing.ebs_monthly_cents(str(vtype), size)

    if rc.resource_type == "aws_eks_cluster":
        return pricing.EKS_CONTROL_PLANE_MONTHLY_CENTS

    if rc.resource_type == "aws_eks_node_group":
        itype = a.get("instance_type", a.get("instance_types", "t3.medium"))
        if isinstance(itype, list):
            itype = itype[0]
        desired = int(a.get("desired_size", 1))
        return pricing.eks_node_group_monthly_cents(str(itype), desired)

    if rc.resource_type in ("aws_lb", "aws_alb"):
        load_balancer_type = a.get("load_balancer_type", "application")
        if str(load_balancer_type) == "network":
            return pricing.NLB_MONTHLY_CENTS
        return pricing.ALB_MONTHLY_CENTS

    if rc.resource_type == "aws_cloudfront_distribution":
        return 100  # minimal estimate — usage-based

    if rc.resource_type == "aws_elasticache_cluster":
        ntype = a.get("node_type", "cache.t3.micro")
        num_cache = int(a.get("num_cache_nodes", 1))
        per_node = pricing.ELASTICACHE_PRICING.get(str(ntype).lower(), 1752)
        return per_node * num_cache

    if rc.resource_type == "aws_s3_bucket":
        return 0  # cost depends on usage, not definition

    if rc.resource_type == "aws_lambda_function":
        memory = int(a.get("memory_size", 128))
        # Flat estimate for small functions
        return max(0, (memory // 128) * 50)

    return 0
