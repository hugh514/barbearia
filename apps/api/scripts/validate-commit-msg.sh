#!/usr/bin/env bash
# Reject forbidden tool-attribution trailers (HUG commit policy).
set -euo pipefail

if [[ $# -ge 1 && -f "$1" ]]; then
  body="$(cat "$1")"
else
  body="$(cat)"
fi

if echo "$body" | grep -qiE '^[[:space:]]*co-authored-by:[[:space:]]*(cursor|paperclip)\b'; then
  echo "commit-msg: forbidden Co-Authored-By trailer (Cursor/Paperclip). See CONTRIBUTING.md" >&2
  exit 1
fi

if echo "$body" | grep -qiE '^[[:space:]]*made-with:[[:space:]]*cursor\b'; then
  echo "commit-msg: forbidden Made-with: Cursor trailer. See CONTRIBUTING.md" >&2
  exit 1
fi

exit 0
