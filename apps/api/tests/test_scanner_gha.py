"""Tests for GitHub Actions static analysis rules (GHA001–GHA007)."""

from driftguard.services.scanner.rules.github_actions import _scan_single

# ── helpers ──────────────────────────────────────────────────────────────────


def rule_ids(content: str) -> set[str]:
    return {f.rule_id for f in _scan_single(content, ".github/workflows/ci.yml")}


def assert_triggers(rule: str, content: str):
    assert rule in rule_ids(content), f"{rule} should fire on:\n{content}"


def assert_passes(rule: str, content: str):
    assert rule not in rule_ids(content), f"{rule} should NOT fire on:\n{content}"


# ── minimal safe workflow (all best-practices applied) ───────────────────────

_SAFE_WORKFLOW = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@a81bbbf8298c0fa03ea29cdc473d45769f953675
      - uses: actions/setup-node@1d0ff469b109b1dc9b6c7e648b6ac934e2810e34
      - run: npm ci
"""


# ── GHA001: Unpinned action ───────────────────────────────────────────────────


def test_gha001_branch_ref_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
"""
    assert_triggers("GHA001", content)


def test_gha001_semver_ref_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v3
"""
    assert_triggers("GHA001", content)


def test_gha001_sha_pinned_passes():
    assert_passes("GHA001", _SAFE_WORKFLOW)


def test_gha001_master_branch_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
"""
    assert_triggers("GHA001", content)


# ── GHA002: ACTIONS_ALLOW_UNSECURE_COMMANDS ───────────────────────────────────


def test_gha002_unsecure_commands_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    env:
      ACTIONS_ALLOW_UNSECURE_COMMANDS: true
    steps:
      - run: echo hello
"""
    assert_triggers("GHA002", content)


def test_gha002_not_set_passes():
    assert_passes("GHA002", _SAFE_WORKFLOW)


# ── GHA003: Script injection ──────────────────────────────────────────────────


def test_gha003_pr_title_injection_triggers():
    content = """\
on: pull_request
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - run: echo "${{ github.event.pull_request.title }}"
"""
    assert_triggers("GHA003", content)


def test_gha003_issue_body_injection_triggers():
    content = """\
on: issues
permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - run: |
          echo "${{ github.event.issue.body }}"
"""
    assert_triggers("GHA003", content)


def test_gha003_env_var_indirection_passes():
    content = """\
on: pull_request
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - env:
          PR_TITLE: ${{ github.event.pull_request.title }}
        run: echo "$PR_TITLE"
"""
    assert_passes("GHA003", content)


def test_gha003_safe_context_passes():
    assert_passes("GHA003", _SAFE_WORKFLOW)


# ── GHA004: Missing permissions ───────────────────────────────────────────────


def test_gha004_no_permissions_triggers():
    content = """\
on: push

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@a81bbbf8298c0fa03ea29cdc473d45769f953675
      - run: npm ci
"""
    assert_triggers("GHA004", content)


def test_gha004_with_permissions_passes():
    assert_passes("GHA004", _SAFE_WORKFLOW)


# ── GHA005: pull_request_target unsafe checkout ───────────────────────────────


def test_gha005_pr_target_unsafe_checkout_triggers():
    content = """\
on: pull_request_target
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@a81bbbf8298c0fa03ea29cdc473d45769f953675
        with:
          ref: ${{ github.event.pull_request.head.ref }}
      - run: npm ci
"""
    assert_triggers("GHA005", content)


def test_gha005_pr_target_safe_ref_passes():
    content = """\
on: pull_request_target
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@a81bbbf8298c0fa03ea29cdc473d45769f953675
      - run: npm ci
"""
    assert_passes("GHA005", content)


def test_gha005_regular_pr_trigger_passes():
    assert_passes("GHA005", _SAFE_WORKFLOW)


# ── GHA007: curl | bash ───────────────────────────────────────────────────────


def test_gha007_curl_pipe_bash_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - run: curl -fsSL https://example.com/install.sh | bash
"""
    assert_triggers("GHA007", content)


def test_gha007_curl_pipe_sh_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - run: curl https://example.com/install.sh | sh
"""
    assert_triggers("GHA007", content)


def test_gha007_safe_curl_passes():
    content = """\
on: push
permissions:
  contents: read

jobs:
  install:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -fsSL https://example.com/install.sh -o install.sh
          sha256sum install.sh
          bash install.sh
"""
    assert_passes("GHA007", content)


# ── non-workflow files are ignored ───────────────────────────────────────────


def test_non_workflow_yaml_ignored():
    content = """\
name: my-config
value: 123
"""
    assert _scan_single(content, "config.yml") == []


# ── finding metadata ─────────────────────────────────────────────────────────


def test_finding_has_line_number():
    content = """\
on: push
permissions:
  contents: read

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@main
"""
    findings = _scan_single(content, ".github/workflows/ci.yml")
    gha001 = next(f for f in findings if f.rule_id == "GHA001")
    assert gha001.line is not None and gha001.line >= 1
    assert gha001.file == ".github/workflows/ci.yml"
    assert gha001.suggestion


def test_safe_workflow_has_no_findings():
    assert _scan_single(_SAFE_WORKFLOW, ".github/workflows/ci.yml") == []


# ── GHA006: Secret directly in run step ──────────────────────────────────────


def test_gha006_secret_in_run_triggers():
    content = """\
on: push
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: curl -H "Authorization: ${{ secrets.API_TOKEN }}" https://api.example.com/deploy
"""
    assert_triggers("GHA006", content)


def test_gha006_secret_via_env_var_passes():
    content = """\
on: push
permissions:
  contents: read

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - env:
          API_TOKEN: ${{ secrets.API_TOKEN }}
        run: curl -H "Authorization: $API_TOKEN" https://api.example.com/deploy
"""
    assert_passes("GHA006", content)


# ── GHA008: Untrusted event data in if: condition ─────────────────────────────


def test_gha008_untrusted_input_in_if_triggers():
    content = """\
on: pull_request
permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    if: ${{ github.event.pull_request.title != 'skip' }}
    steps:
      - run: echo "running"
"""
    assert_triggers("GHA008", content)


def test_gha008_safe_if_condition_passes():
    content = """\
on: pull_request
permissions:
  contents: read

jobs:
  check:
    runs-on: ubuntu-latest
    if: github.actor != 'dependabot[bot]'
    steps:
      - run: echo "running"
"""
    assert_passes("GHA008", content)
