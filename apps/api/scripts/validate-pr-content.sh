#!/usr/bin/env bash
# Validate pull request title and body against HUG attribution policy.
set -euo pipefail

script_dir="$(cd "$(dirname "$0")" && pwd)"
validator="${script_dir}/validate-attribution.sh"

title="${PR_TITLE:-}"
body="${PR_BODY:-}"

if [[ -z "$title" ]]; then
  echo "validate-pr-content: PR_TITLE is required" >&2
  exit 1
fi

printf '%s\n' "$title" | "$validator" "pull-request title"
printf '%s\n' "$body" | "$validator" "pull-request body"

exit 0
