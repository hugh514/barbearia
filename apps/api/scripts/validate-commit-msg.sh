#!/usr/bin/env bash
# Reject forbidden tool-attribution trailers (HUG commit policy).
set -euo pipefail

exec "$(dirname "$0")/validate-attribution.sh" "commit-msg" "$@"
