#!/usr/bin/env bash
# Self-test for the secret-scanning configuration.
#
# A secret scanner has two ways to fail and only one of them is loud:
#
#   1. It flags things that are not credentials. You notice immediately,
#      because CI goes red and someone complains.
#   2. It stops flagging things that ARE credentials. Nobody notices, and the
#      gate silently becomes decoration.
#
# Failure mode 2 is not hypothetical here. gitleaks 8.21.2 accepts a top-level
# `[[allowlists]]` array-of-tables without a parse error and then ignores every
# entry in it. An earlier version of .gitleaks.toml used that form; the config
# looked correct, gitleaks exited successfully, and the allowlist did nothing.
# The only reason it was caught is that the suppressed paths came back.
#
# So: prove both directions on synthetic fixtures. Run this after any change to
# .gitleaks.toml and after any gitleaks version bump.
set -euo pipefail

GITLEAKS="${GITLEAKS:-gitleaks}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CONFIG="$ROOT/.gitleaks.toml"

if ! command -v "$GITLEAKS" >/dev/null 2>&1; then
  echo "gitleaks not found. Install it, or set GITLEAKS=/path/to/gitleaks." >&2
  exit 127
fi

WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

# Fixtures are generated, never committed -- a repository that ships realistic
# fake credentials teaches the scanner's users to ignore realistic credentials.
# High entropy matters: gitleaks drops low-entropy matches, so a fixture of
# "aaaa..." would pass every test while proving nothing.
rand_hex() { python3 -c "import secrets;print(secrets.token_hex($1))"; }
rand_b62() { python3 -c "
import secrets,string
a=string.ascii_letters+string.digits
print(''.join(secrets.choice(a) for _ in range($1)))"; }

fail=0
check() { # check <expect: detect|ignore> <label> <relative-path> <content>
  local expect="$1" label="$2" rel="$3" content="$4"
  local dir="$WORK/case"
  rm -rf "$dir"; mkdir -p "$dir/$(dirname "$rel")"
  printf '%s\n' "$content" > "$dir/$rel"

  local n
  "$GITLEAKS" detect --source "$dir" --config "$CONFIG" --no-git --redact \
    --report-format json --report-path "$dir/report.json" --exit-code 0 \
    >/dev/null 2>&1 || true
  n="$(python3 -c "import json;print(len(json.load(open('$dir/report.json'))))")"

  if [ "$expect" = "detect" ] && [ "$n" -eq 0 ]; then
    echo "  FAIL  $label -- expected a finding, got none"; fail=1
  elif [ "$expect" = "ignore" ] && [ "$n" -ne 0 ]; then
    echo "  FAIL  $label -- expected no finding, got $n"; fail=1
  else
    echo "  ok    $label"
  fi
}

echo "Positive controls (these MUST be detected):"
check detect "webhook secret in Markdown"      "DEPLOY.md" \
  "secret driftguard-gh-webhook-secret \"$(rand_hex 32)\""
check detect "GitHub PAT in source"            "app/x.ts" \
  "const t = \"ghp_$(rand_b62 36)\";"
check detect "AWS access key id"               "infra/x.tf" \
  "access_key = \"AKIA$(python3 -c "
import secrets,string
print(''.join(secrets.choice(string.ascii_uppercase+string.digits) for _ in range(16)))")\""
# The PEM banner is assembled from parts on purpose. Written as a literal, this
# fixture makes the self-test script itself a gitleaks finding -- the scanner
# cannot tell a test fixture from the real thing, and it is right not to try.
SP=' '
check detect "private key block"               "keys/id.pem" \
  "-----BEGIN RSA PRIVATE${SP}KEY-----
$(rand_b62 64)
-----END RSA PRIVATE${SP}KEY-----"
check detect "secret in a nested app dir"      "apps/api/driftguard/core/x.py" \
  "SIGNING_SECRET = \"$(rand_hex 32)\""

echo "Negative controls (these must NOT be flagged):"
check ignore "documented placeholder"          "DEPLOY.md" \
  'secret driftguard-gh-webhook-secret "<YOUR_GITHUB_APP_WEBHOOK_SECRET>"'
check ignore "PEM header with no body"         "docs/env.tsx" \
  'example: "-----BEGIN RSA PRIVATE KEY-----…"'
check ignore "truncated token in curl example" "app/Token.tsx" \
  'curl -H "Authorization: Bearer dg_live_..." https://api.driftguard.io/v1'
check ignore "k8s existing-secret reference"   "infra/redis.tf" \
  'existingSecretPasswordKey = "password"'
check ignore "sha256 digest, not a credential" "apps/web/lib/demo.ts" \
  "export const GENESIS_HASH = \"sha256:$(rand_hex 32)\";"
check ignore "lockfile integrity hash"         "uv.lock" \
  "api_key = \"$(rand_hex 32)\"   # inside an allowlisted path"

echo
if [ "$fail" -ne 0 ]; then
  echo "secret-scanning self-test FAILED -- .gitleaks.toml is not behaving as documented." >&2
  exit 1
fi
echo "secret-scanning self-test passed."
