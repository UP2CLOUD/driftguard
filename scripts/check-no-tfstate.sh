#!/usr/bin/env bash
# Fail if Terraform state or plan artifacts are tracked by git.
#
# Terraform state stores every resource attribute in cleartext, including the
# ones marked `sensitive` in the configuration -- database passwords, generated
# access keys, TLS private keys. `sensitive` only suppresses *CLI output*; it
# has no effect on what lands in the state file. So a committed .tfstate is a
# credential dump, and .gitignore alone is not a control: `git add -f` bypasses
# it silently and nothing downstream notices.
#
# Plan binaries (`terraform plan -out=…`) carry the same payload -- a plan
# includes the prior state it was computed against.
#
# Used by .github/workflows/security-secrets.yml and by the pre-commit hook.
set -euo pipefail

# Match on path, not content: an empty or truncated state file is still a
# policy violation, and we must never read the contents to decide.
PATTERN='(^|/)[^/]*\.tfstate$|(^|/)[^/]*\.tfstate\.[^/]*$|(^|/)[^/]*\.tfplan$|(^|/)tfplan[^/]*$|(^|/)\.terraform/'

if [ "$#" -gt 0 ]; then
  # Pre-commit passes the staged files as arguments.
  candidates=$(printf '%s\n' "$@")
else
  candidates=$(git ls-files)
fi

offenders=$(printf '%s\n' "$candidates" | grep -E "$PATTERN" || true)

if [ -n "$offenders" ]; then
  echo "ERROR: Terraform state or plan artifacts are tracked by git." >&2
  echo >&2
  # Print paths only. Never cat, grep, or diff the file -- this script runs in
  # CI logs that are world-readable on a public repository.
  printf '%s\n' "$offenders" | sed 's/^/  /' >&2
  echo >&2
  echo "State files contain every resource attribute in cleartext, including" >&2
  echo "values marked \`sensitive\`. Remove them from the index, keep them out" >&2
  echo "of the tree, and use a remote backend (see infra/terraform/bootstrap)." >&2
  echo >&2
  echo "  git rm --cached <path>" >&2
  echo >&2
  echo "If any of these were ever pushed, treat every credential they could" >&2
  echo "contain as compromised and follow docs/SECRET_ROTATION.md." >&2
  exit 1
fi

echo "OK: no Terraform state or plan artifacts tracked."
