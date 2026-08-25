"""Scanner rule IDs mapped to compliance control categories.

Two independent sources feed `RULE_TO_CONTROLS`, kept in separate dicts below
because they're maintained against different upstreams:

  - `_AWS` / `_AZURE` / `_GCP` / `_K8S`: ~200 Checkov rules across AWS, Azure,
    GCP, Kubernetes. Source: https://www.checkov.io/5.Policy%20Index/terraform.html
  - `_NATIVE`: DriftGuard's own scanner rules (TF00x, K8S00x, GHA00x — see
    `services/scanner/rules/*.py`). Every finding those files produce already
    carries a `controls=[...]` tag (e.g. `["access_control", "least_privilege"]`)
    set at the point the rule fires, but that tag uses an ad-hoc vocabulary
    that was never wired to this module — `from_static_scan()` in
    `ai/findings.py` calls `controls_for_rule(sf.rule_id)` exactly like it
    does for Checkov findings, and until this dict existed that lookup always
    returned `()` for TF00x/K8S00x/GHA00x, so no native finding ever cited a
    compliance article. `_NATIVE` maps directly to `CATALOG` control IDs
    (see `controls.py`), not to the scanner's own ad-hoc tags.

Coverage is intentionally partial in `_NATIVE`, same as it already is for
Checkov: a rule is mapped only when its finding genuinely matches a
`CATALOG` control's stated scope. Rules about reliability/operability rather
than security or compliance (missing readiness probes, unpinned Lambda
concurrency, missing resource limits) are left unmapped rather than forced
into a category that doesn't fit — an inexact citation is worse than none in
a PR comment a customer may cite as compliance evidence.
"""

# fmt: off
_AWS: dict[str, tuple[str, ...]] = {
    # encryption at rest
    "CKV_AWS_3": ("encryption_at_rest",),
    "CKV_AWS_7": ("encryption_at_rest",),
    "CKV_AWS_8": ("encryption_at_rest", "vulnerability_management"),
    "CKV_AWS_14": ("encryption_at_rest",),
    "CKV_AWS_16": ("encryption_at_rest",),
    "CKV_AWS_17": ("encryption_at_rest",),
    "CKV_AWS_19": ("encryption_at_rest",),
    "CKV_AWS_27": ("encryption_at_rest",),
    "CKV_AWS_29": ("encryption_at_rest",),
    "CKV_AWS_30": ("encryption_at_rest",),
    "CKV_AWS_31": ("encryption_at_rest",),
    "CKV_AWS_32": ("encryption_at_rest",),
    "CKV_AWS_33": ("encryption_at_rest",),
    "CKV_AWS_51": ("encryption_at_rest",),
    "CKV_AWS_71": ("encryption_at_rest",),
    "CKV_AWS_74": ("encryption_at_rest",),
    "CKV_AWS_81": ("encryption_at_rest",),
    "CKV_AWS_92": ("encryption_at_rest",),
    "CKV_AWS_94": ("encryption_at_rest",),
    "CKV_AWS_97": ("encryption_at_rest",),
    "CKV_AWS_131": ("encryption_at_rest",),
    "CKV_AWS_145": ("encryption_at_rest",),
    "CKV_AWS_158": ("encryption_at_rest",),
    "CKV_AWS_166": ("encryption_at_rest",),
    "CKV_AWS_186": ("encryption_at_rest",),
    "CKV_AWS_189": ("encryption_at_rest",),
    "CKV_AWS_195": ("encryption_at_rest",),
    "CKV_AWS_211": ("encryption_at_rest",),
    "CKV_AWS_224": ("encryption_at_rest",),
    "CKV_AWS_245": ("encryption_at_rest",),
    "CKV_AWS_251": ("encryption_at_rest",),

    # encryption in transit
    "CKV_AWS_2": ("encryption_in_transit",),
    "CKV_AWS_20": ("encryption_in_transit",),
    "CKV_AWS_45": ("encryption_in_transit",),
    "CKV_AWS_47": ("encryption_in_transit",),
    "CKV_AWS_91": ("encryption_in_transit",),
    "CKV_AWS_95": ("encryption_in_transit",),
    "CKV_AWS_103": ("encryption_in_transit",),
    "CKV_AWS_137": ("encryption_in_transit",),
    "CKV_AWS_138": ("encryption_in_transit",),
    "CKV_AWS_150": ("encryption_in_transit",),
    "CKV_AWS_178": ("encryption_in_transit",),
    "CKV_AWS_213": ("encryption_in_transit",),
    "CKV_AWS_215": ("encryption_in_transit",),
    "CKV_AWS_217": ("encryption_in_transit",),
    "CKV_AWS_232": ("encryption_in_transit",),
    "CKV_AWS_233": ("encryption_in_transit",),

    # public exposure
    "CKV_AWS_5": ("public_exposure",),
    "CKV_AWS_23": ("public_exposure",),
    "CKV_AWS_24": ("public_exposure",),
    "CKV_AWS_25": ("public_exposure",),
    "CKV_AWS_46": ("public_exposure",),
    "CKV_AWS_53": ("public_exposure",),
    "CKV_AWS_54": ("public_exposure",),
    "CKV_AWS_55": ("public_exposure",),
    "CKV_AWS_56": ("public_exposure",),
    "CKV_AWS_57": ("public_exposure",),
    "CKV_AWS_58": ("public_exposure",),
    "CKV_AWS_72": ("public_exposure",),
    "CKV_AWS_73": ("public_exposure",),
    "CKV_AWS_88": ("public_exposure",),
    "CKV_AWS_99": ("public_exposure",),
    "CKV_AWS_115": ("public_exposure",),
    "CKV_AWS_117": ("public_exposure",),
    "CKV_AWS_119": ("public_exposure",),
    "CKV_AWS_120": ("public_exposure",),
    "CKV_AWS_135": ("public_exposure",),
    "CKV_AWS_136": ("public_exposure",),
    "CKV_AWS_172": ("public_exposure",),
    "CKV_AWS_191": ("public_exposure",),
    "CKV_AWS_260": ("public_exposure",),
    "CKV_AWS_269": ("public_exposure",),
    "CKV_AWS_273": ("public_exposure", "access_control"),

    # logging / audit
    "CKV_AWS_18": ("logging_audit",),
    "CKV_AWS_35": ("logging_audit",),
    "CKV_AWS_36": ("logging_audit",),
    "CKV_AWS_37": ("logging_audit",),
    "CKV_AWS_38": ("logging_audit",),
    "CKV_AWS_39": ("logging_audit",),
    "CKV_AWS_40": ("logging_audit",),
    "CKV_AWS_50": ("logging_audit",),
    "CKV_AWS_52": ("logging_audit",),
    "CKV_AWS_66": ("logging_audit",),
    "CKV_AWS_67": ("logging_audit",),
    "CKV_AWS_75": ("logging_audit",),
    "CKV_AWS_76": ("logging_audit",),
    "CKV_AWS_77": ("logging_audit",),
    "CKV_AWS_85": ("logging_audit",),
    "CKV_AWS_86": ("logging_audit",),
    "CKV_AWS_118": ("logging_audit",),
    "CKV_AWS_237": ("logging_audit",),
    "CKV_AWS_252": ("logging_audit",),
    "CKV_AWS_262": ("logging_audit",),

    # access control / IAM
    "CKV_AWS_1": ("access_control",),
    "CKV_AWS_41": ("access_control",),
    "CKV_AWS_43": ("access_control",),
    "CKV_AWS_44": ("access_control",),
    "CKV_AWS_49": ("access_control",),
    "CKV_AWS_60": ("access_control",),
    "CKV_AWS_61": ("access_control",),
    "CKV_AWS_62": ("access_control",),
    "CKV_AWS_63": ("access_control",),
    "CKV_AWS_64": ("access_control",),
    "CKV_AWS_65": ("access_control",),
    "CKV_AWS_107": ("access_control",),
    "CKV_AWS_108": ("access_control",),
    "CKV_AWS_109": ("access_control",),
    "CKV_AWS_110": ("access_control",),
    "CKV_AWS_111": ("access_control",),
    "CKV_AWS_112": ("access_control",),
    "CKV_AWS_113": ("access_control",),
    "CKV_AWS_140": ("access_control",),
    "CKV_AWS_142": ("access_control",),
    "CKV_AWS_174": ("access_control",),
    "CKV_AWS_283": ("access_control",),
    "CKV_AWS_287": ("access_control",),
    "CKV_AWS_290": ("access_control",),
    "CKV_AWS_293": ("access_control",),
    "CKV_AWS_355": ("access_control",),

    # backup / retention
    "CKV_AWS_21": ("backup_retention",),
    "CKV_AWS_28": ("backup_retention",),
    "CKV_AWS_133": ("backup_retention",),
    "CKV_AWS_162": ("backup_retention",),
    "CKV_AWS_176": ("backup_retention",),
    "CKV_AWS_197": ("backup_retention",),
    "CKV_AWS_226": ("backup_retention",),
    "CKV_AWS_338": ("backup_retention",),

    # vulnerability management
    "CKV_AWS_79": ("vulnerability_management",),
    "CKV_AWS_157": ("vulnerability_management",),
}

_AZURE: dict[str, tuple[str, ...]] = {
    # encryption
    "CKV_AZURE_2": ("encryption_at_rest",),
    "CKV_AZURE_3": ("encryption_at_rest",),
    "CKV_AZURE_4": ("encryption_at_rest",),
    "CKV_AZURE_5": ("encryption_at_rest",),
    "CKV_AZURE_18": ("encryption_at_rest",),
    "CKV_AZURE_25": ("encryption_at_rest",),
    "CKV_AZURE_33": ("encryption_at_rest",),
    "CKV_AZURE_44": ("encryption_at_rest",),
    "CKV_AZURE_50": ("encryption_at_rest",),
    "CKV_AZURE_93": ("encryption_at_rest",),
    "CKV_AZURE_97": ("encryption_at_rest",),
    "CKV_AZURE_109": ("encryption_at_rest",),
    "CKV_AZURE_158": ("encryption_at_rest",),

    "CKV_AZURE_1": ("encryption_in_transit",),
    "CKV_AZURE_15": ("encryption_in_transit",),
    "CKV_AZURE_28": ("encryption_in_transit",),
    "CKV_AZURE_43": ("encryption_in_transit",),
    "CKV_AZURE_54": ("encryption_in_transit",),
    "CKV_AZURE_73": ("encryption_in_transit",),
    "CKV_AZURE_222": ("encryption_in_transit",),

    # public exposure
    "CKV_AZURE_8": ("public_exposure",),
    "CKV_AZURE_9": ("public_exposure",),
    "CKV_AZURE_10": ("public_exposure",),
    "CKV_AZURE_11": ("public_exposure",),
    "CKV_AZURE_12": ("public_exposure",),
    "CKV_AZURE_16": ("public_exposure",),
    "CKV_AZURE_17": ("public_exposure",),
    "CKV_AZURE_24": ("public_exposure",),
    "CKV_AZURE_35": ("public_exposure",),
    "CKV_AZURE_36": ("public_exposure",),
    "CKV_AZURE_53": ("public_exposure",),
    "CKV_AZURE_59": ("public_exposure",),
    "CKV_AZURE_77": ("public_exposure",),

    # logging
    "CKV_AZURE_37": ("logging_audit",),
    "CKV_AZURE_38": ("logging_audit",),
    "CKV_AZURE_57": ("logging_audit",),
    "CKV_AZURE_91": ("logging_audit",),
    "CKV_AZURE_92": ("logging_audit",),
    "CKV_AZURE_113": ("logging_audit",),

    # access control
    "CKV_AZURE_22": ("access_control",),
    "CKV_AZURE_55": ("access_control",),
    "CKV_AZURE_140": ("access_control",),
    "CKV_AZURE_141": ("access_control",),
    "CKV_AZURE_212": ("access_control",),
}

_GCP: dict[str, tuple[str, ...]] = {
    "CKV_GCP_6": ("encryption_at_rest",),
    "CKV_GCP_22": ("encryption_at_rest",),
    "CKV_GCP_29": ("encryption_at_rest",),
    "CKV_GCP_37": ("encryption_at_rest",),
    "CKV_GCP_43": ("encryption_at_rest",),
    "CKV_GCP_56": ("encryption_at_rest",),
    "CKV_GCP_77": ("encryption_at_rest",),
    "CKV_GCP_79": ("encryption_at_rest",),

    "CKV_GCP_27": ("encryption_in_transit",),
    "CKV_GCP_3": ("encryption_in_transit",),
    "CKV_GCP_39": ("encryption_in_transit",),

    "CKV_GCP_2": ("public_exposure",),
    "CKV_GCP_7": ("public_exposure",),
    "CKV_GCP_30": ("public_exposure",),
    "CKV_GCP_31": ("public_exposure",),
    "CKV_GCP_38": ("public_exposure",),
    "CKV_GCP_69": ("public_exposure",),
    "CKV_GCP_71": ("public_exposure",),
    "CKV_GCP_74": ("public_exposure",),
    "CKV_GCP_76": ("public_exposure",),
    "CKV_GCP_92": ("public_exposure",),

    "CKV_GCP_82": ("logging_audit",),
    "CKV_GCP_8": ("logging_audit",),
    "CKV_GCP_10": ("logging_audit",),
    "CKV_GCP_11": ("logging_audit",),
    "CKV_GCP_24": ("logging_audit",),

    "CKV_GCP_45": ("access_control",),
    "CKV_GCP_49": ("access_control",),
    "CKV_GCP_50": ("access_control",),
    "CKV_GCP_64": ("access_control",),
    "CKV_GCP_117": ("access_control",),
    "CKV_GCP_72": ("access_control",),
}

_K8S: dict[str, tuple[str, ...]] = {
    # container security: privilege, root, capabilities, host access
    "CKV_K8S_1": ("container_security",),
    "CKV_K8S_2": ("container_security",),
    "CKV_K8S_3": ("container_security",),
    "CKV_K8S_4": ("container_security",),
    "CKV_K8S_5": ("container_security",),
    "CKV_K8S_6": ("container_security",),
    "CKV_K8S_7": ("container_security",),
    "CKV_K8S_8": ("container_security",),
    "CKV_K8S_9": ("container_security",),
    "CKV_K8S_10": ("container_security",),
    "CKV_K8S_11": ("container_security",),
    "CKV_K8S_12": ("container_security",),
    "CKV_K8S_13": ("container_security",),
    "CKV_K8S_14": ("container_security",),
    "CKV_K8S_15": ("container_security",),
    "CKV_K8S_16": ("container_security",),
    "CKV_K8S_17": ("container_security",),
    "CKV_K8S_18": ("container_security",),
    "CKV_K8S_19": ("container_security",),
    "CKV_K8S_20": ("container_security",),
    "CKV_K8S_21": ("container_security",),
    "CKV_K8S_22": ("container_security",),
    "CKV_K8S_23": ("container_security",),
    "CKV_K8S_25": ("container_security",),
    "CKV_K8S_26": ("container_security",),
    "CKV_K8S_27": ("container_security",),
    "CKV_K8S_28": ("container_security",),
    "CKV_K8S_29": ("container_security",),
    "CKV_K8S_30": ("container_security",),
    "CKV_K8S_31": ("container_security",),
    "CKV_K8S_36": ("container_security",),
    "CKV_K8S_37": ("container_security",),
    "CKV_K8S_38": ("container_security",),
    "CKV_K8S_40": ("container_security",),

    # RBAC -> access_control
    "CKV_K8S_42": ("access_control",),
    "CKV_K8S_43": ("access_control",),
    "CKV_K8S_44": ("access_control",),
    "CKV_K8S_45": ("access_control",),
    "CKV_K8S_46": ("access_control",),
    "CKV_K8S_49": ("access_control",),
    "CKV_K8S_155": ("access_control",),
    "CKV_K8S_156": ("access_control",),
    "CKV_K8S_157": ("access_control",),
    "CKV_K8S_158": ("access_control",),

    # image versioning -> vulnerability_management
    "CKV_K8S_32": ("container_security", "vulnerability_management"),
    "CKV_K8S_33": ("container_security",),
    "CKV_K8S_34": ("vulnerability_management",),
    "CKV_K8S_35": ("vulnerability_management",),
    "CKV_K8S_39": ("container_security",),
    "CKV_K8S_41": ("container_security",),
}
# fmt: off
# DriftGuard's own scanner rules (services/scanner/rules/{terraform,kubernetes,github_actions}.py).
# Each comment names the rule; see those files for the exact finding text.
_NATIVE: dict[str, tuple[str, ...]] = {
    # -- terraform.py --
    "TF001": ("access_control",),        # IAM policy Resource: "*"
    "TF002": ("public_exposure",),        # S3 bucket missing public access block
    "TF003": ("backup_retention",),       # force_destroy=true on storage — accidental data loss
    "TF004": ("backup_retention",),       # RDS skip_final_snapshot
    "TF005": ("backup_retention",),       # RDS missing deletion_protection
    "TF007": ("public_exposure",),        # security group open to 0.0.0.0/0
    "TF008": ("backup_retention",),       # KMS key deletion window < 7 days
    "TF009": ("change_management",),      # missing required_providers version pins
    "TF010": ("encryption_at_rest",),     # EBS volume not encrypted
    "TF012": ("access_control",),         # IAM policy Action: "*"
    "TF013": ("public_exposure",),        # S3 bucket public ACL
    "TF014": ("public_exposure",),        # RDS publicly_accessible

    # -- kubernetes.py --
    "K8S001": ("container_security",),    # privileged: true
    "K8S003": ("container_security",),    # hostPID / hostNetwork
    "K8S004": ("container_security",),    # runAsNonRoot not set
    "K8S005": ("container_security",),    # allowPrivilegeEscalation not disabled
    "K8S006": ("vulnerability_management",),  # :latest / untagged image — can't audit deployed patch level
    "K8S008": ("container_security",),    # missing securityContext
    "K8S009": ("container_security",),    # readOnlyRootFilesystem not set
    "K8S010": ("container_security",),    # capabilities.add includes ALL

    # -- github_actions.py --
    "GHA001": ("change_management",),     # action pinned to mutable ref, not a SHA
    "GHA002": ("change_management",),     # ACTIONS_ALLOW_UNSECURE_COMMANDS
    "GHA004": ("access_control",),        # missing permissions: block (defaults write-all)
    "GHA005": ("access_control",),        # pull_request_target with unsafe checkout of PR head
}
# fmt: on

CHECKOV_RULE_TO_CONTROLS: dict[str, tuple[str, ...]] = {**_AWS, **_AZURE, **_GCP, **_K8S}
RULE_TO_CONTROLS: dict[str, tuple[str, ...]] = {**CHECKOV_RULE_TO_CONTROLS, **_NATIVE}


def controls_for_rule(rule_id: str | None) -> tuple[str, ...]:
    if not rule_id:
        return ()
    return RULE_TO_CONTROLS.get(rule_id, ())


def coverage_stats() -> dict[str, int]:
    return {
        "aws": len(_AWS),
        "azure": len(_AZURE),
        "gcp": len(_GCP),
        "k8s": len(_K8S),
        "native": len(_NATIVE),
        "total": len(RULE_TO_CONTROLS),
    }
