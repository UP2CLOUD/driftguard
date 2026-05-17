from dataclasses import dataclass
from typing import Literal

Framework = Literal["DORA", "NIS2", "ISO27001", "GDPR", "CIS"]


@dataclass(frozen=True)
class ControlRef:
    framework: Framework
    code: str
    title: str


@dataclass(frozen=True)
class Control:
    id: str
    category: str
    description: str
    refs: tuple[ControlRef, ...]


CATALOG: dict[str, Control] = {
    "encryption_at_rest": Control(
        id="encryption_at_rest",
        category="data_protection",
        description="Data must be encrypted at rest for storage, databases, and backups.",
        refs=(
            ControlRef("DORA", "Art.9", "ICT risk protection and prevention"),
            ControlRef("NIS2", "Art.21(2)(h)", "Cryptography and encryption policies"),
            ControlRef("ISO27001", "A.8.24", "Use of cryptography"),
            ControlRef("GDPR", "Art.32", "Security of processing"),
        ),
    ),
    "encryption_in_transit": Control(
        id="encryption_in_transit",
        category="data_protection",
        description="Network traffic must use TLS for confidentiality and integrity.",
        refs=(
            ControlRef("DORA", "Art.9", "ICT risk protection and prevention"),
            ControlRef("NIS2", "Art.21(2)(h)", "Cryptography and encryption policies"),
            ControlRef("ISO27001", "A.8.20", "Networks security"),
            ControlRef("ISO27001", "A.8.24", "Use of cryptography"),
        ),
    ),
    "public_exposure": Control(
        id="public_exposure",
        category="network_security",
        description="Resources must not be publicly accessible unless explicitly required.",
        refs=(
            ControlRef("DORA", "Art.9", "ICT risk protection and prevention"),
            ControlRef("NIS2", "Art.21(2)(e)", "Network and information systems security"),
            ControlRef("ISO27001", "A.8.22", "Segregation of networks"),
            ControlRef("ISO27001", "A.8.23", "Web filtering"),
            ControlRef("CIS", "AWS-CB", "CIS AWS Benchmark"),
        ),
    ),
    "logging_audit": Control(
        id="logging_audit",
        category="monitoring",
        description="All resources must produce logs forwarded to a centralized, tamper-evident store.",
        refs=(
            ControlRef("DORA", "Art.10", "Detection mechanisms"),
            ControlRef("NIS2", "Art.21(2)(b)", "Incident handling"),
            ControlRef("ISO27001", "A.8.15", "Logging"),
            ControlRef("ISO27001", "A.8.16", "Monitoring activities"),
        ),
    ),
    "access_control": Control(
        id="access_control",
        category="iam",
        description="Identity and access must follow least-privilege and segregation of duties.",
        refs=(
            ControlRef("DORA", "Art.9", "ICT risk protection and prevention"),
            ControlRef("ISO27001", "A.5.15", "Access control"),
            ControlRef("ISO27001", "A.5.16", "Identity management"),
            ControlRef("ISO27001", "A.8.2", "Privileged access rights"),
        ),
    ),
    "backup_retention": Control(
        id="backup_retention",
        category="resilience",
        description="Data must have backups, retention, and tested restore procedures.",
        refs=(
            ControlRef("DORA", "Art.12", "Backup, restoration and recovery"),
            ControlRef("NIS2", "Art.21(2)(c)", "Business continuity and crisis management"),
            ControlRef("ISO27001", "A.8.13", "Information backup"),
        ),
    ),
    "vulnerability_management": Control(
        id="vulnerability_management",
        category="hardening",
        description="Resources must use supported versions and patched images.",
        refs=(
            ControlRef("NIS2", "Art.21(2)(c)", "Vulnerability handling and disclosure"),
            ControlRef("ISO27001", "A.8.8", "Management of technical vulnerabilities"),
        ),
    ),
    "change_management": Control(
        id="change_management",
        category="governance",
        description="Infrastructure changes must follow controlled, auditable processes.",
        refs=(
            ControlRef("DORA", "Art.16", "ICT change management"),
            ControlRef("ISO27001", "A.8.32", "Change management"),
        ),
    ),
    "container_security": Control(
        id="container_security",
        category="hardening",
        description="Containers must run least-privilege, non-root, read-only fs where possible.",
        refs=(
            ControlRef("NIS2", "Art.21(2)(e)", "Network and information systems security"),
            ControlRef("ISO27001", "A.8.9", "Configuration management"),
            ControlRef("CIS", "K8S-CB", "CIS Kubernetes Benchmark"),
        ),
    ),
}


def get(control_id: str) -> Control | None:
    return CATALOG.get(control_id)


def all_controls() -> list[Control]:
    return list(CATALOG.values())
