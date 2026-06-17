from __future__ import annotations

import re
from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class ChangeType(StrEnum):
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    NO_CHANGE = "no_change"


@dataclass
class ResourceChange:
    resource_type: str  # e.g. "aws_instance"
    resource_name: str  # logical name in .tf
    change_type: ChangeType
    provider: str  # "aws" | "google" | "azurerm"
    attributes: dict[str, Any] = field(default_factory=dict)
    old_attributes: dict[str, Any] = field(default_factory=dict)
    file_path: str = ""
    line_number: int = 0

    @property
    def label(self) -> str:
        return f"{self.resource_type}.{self.resource_name}"


_RESOURCE_BLOCK = re.compile(r'^resource\s+"([^"]+)"\s+"([^"]+)"\s*\{', re.MULTILINE)
_ATTR_STRING = re.compile(r'^\s*(\w+)\s*=\s*"([^"]*)"', re.MULTILINE)
_ATTR_NUMBER = re.compile(r"^\s*(\w+)\s*=\s*(\d+(?:\.\d+)?)\b", re.MULTILINE)
_ATTR_BOOL = re.compile(r"^\s*(\w+)\s*=\s*(true|false)\b", re.MULTILINE)
_TAG_BLOCK = re.compile(r"(?:tags|labels)\s*=\s*\{([^}]*)\}", re.DOTALL)
_TAG_ATTR = re.compile(r'(\w+)\s*=\s*"([^"]*)"')
_LIST_ATTR = re.compile(r"^\s*(\w+)\s*=\s*\[([^\]]*)\]", re.MULTILINE)
_LIST_ITEM = re.compile(r'"([^"]*)"')

_COST_ATTRS = {
    "instance_type",
    "db_instance_class",
    "node_type",
    "instance_class",
    "machine_type",
    "vm_size",
    "size",
    "instance_types",
    "allocated_storage",
    "storage_size_gb",
    "disk_size_gb",
    "disk_size",
    "volume_size",
    "volume_type",
    "storage_type",
    "desired_capacity",
    "min_size",
    "max_size",
    "desired_size",
    "node_count",
    "initial_node_count",
    "replicas",
    "engine_version",
    "engine",
    "multi_az",
    "memory_size",
    "timeout",
}

_COST_TAGS = {"environment", "owner", "service", "application", "cost_center", "team"}

PROVIDER_MAP = {
    "aws_": "aws",
    "google_": "google",
    "azurerm_": "azurerm",
}


def _detect_provider(resource_type: str) -> str:
    for prefix, provider in PROVIDER_MAP.items():
        if resource_type.startswith(prefix):
            return provider
    return "unknown"


def _extract_block_content(hcl: str, start: int) -> str:
    """Extract the content of a { } block starting at `start`, string-aware."""
    depth = 0
    i = start
    start_idx = -1
    in_string = False
    escape = False
    while i < len(hcl):
        char = hcl[i]
        if char == '"' and not escape:
            in_string = not in_string
        if char == "\\" and in_string:
            escape = not escape
        else:
            escape = False
        if not in_string:
            if char == "{":
                depth += 1
                if depth == 1:
                    start_idx = i
            elif char == "}":
                depth -= 1
                if depth == 0:
                    return hcl[start_idx + 1 : i]
        i += 1
    return ""


def _parse_attributes(block: str) -> dict[str, Any]:
    attrs: dict[str, Any] = {}
    for m in _ATTR_STRING.finditer(block):
        key, val = m.group(1), m.group(2)
        if key in _COST_ATTRS or key.startswith("tags") or key.startswith("labels"):
            attrs[key] = val
    for m in _ATTR_NUMBER.finditer(block):
        key, val = m.group(1), m.group(2)
        if key in _COST_ATTRS:
            attrs[key] = float(val) if "." in val else int(val)
    for m in _ATTR_BOOL.finditer(block):
        key, val = m.group(1), m.group(2)
        if key in _COST_ATTRS:
            attrs[key] = val == "true"
    # Extract list attributes (e.g. instance_types = ["t3.medium"])
    for m in _LIST_ATTR.finditer(block):
        key = m.group(1)
        if key in _COST_ATTRS:
            items = _LIST_ITEM.findall(m.group(2))
            if items:
                attrs[key] = items
    # Extract tags/labels sub-block (GCP uses labels, AWS/Azure use tags)
    tm = _TAG_BLOCK.search(block)
    if tm:
        tags: dict[str, str] = {}
        for ta in _TAG_ATTR.finditer(tm.group(1)):
            tags[ta.group(1)] = ta.group(2)
        if tags:
            attrs["_tags"] = tags
    return attrs


def parse_terraform_files(
    file_contents: dict[str, str],
) -> list[ResourceChange]:
    """
    Given a mapping of file_path -> file_content, return all resource changes.
    All resources are treated as CREATE since we're analysing the PR diff.
    """
    changes: list[ResourceChange] = []
    for path, content in file_contents.items():
        if not path.endswith((".tf", ".tfvars")):
            continue
        for m in _RESOURCE_BLOCK.finditer(content):
            rtype = m.group(1)
            rname = m.group(2)
            block_content = _extract_block_content(content, m.end() - 1)
            attrs = _parse_attributes(block_content)
            line_no = content[: m.start()].count("\n") + 1
            changes.append(
                ResourceChange(
                    resource_type=rtype,
                    resource_name=rname,
                    change_type=ChangeType.CREATE,
                    provider=_detect_provider(rtype),
                    attributes=attrs,
                    file_path=path,
                    line_number=line_no,
                )
            )
    return changes


def detect_terraform_files(file_paths: list[str]) -> list[str]:
    """Return subset of paths that are Terraform files."""
    return [p for p in file_paths if p.endswith((".tf", ".tfvars", ".hcl")) and not p.endswith(".terraform.lock.hcl")]


def has_terraform_files(file_paths: list[str]) -> bool:
    return bool(detect_terraform_files(file_paths))
