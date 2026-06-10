#!/usr/bin/env bash
# Smoke tests for Feature 001 — Core Foundation
# See: specs/001-core-foundation/validation.md

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_URL="${API_URL:-http://localhost:3000}"
PASS=0
FAIL=0
SKIP=0

green() { printf '\033[0;32m%s\033[0m\n' "$1"; }
red() { printf '\033[0;31m%s\033[0m\n' "$1"; }
yellow() { printf '\033[0;33m%s\033[0m\n' "$1"; }

pass() { green "  PASS  $1"; PASS=$((PASS + 1)); }
fail() { red "  FAIL  $1"; FAIL=$((FAIL + 1)); }
skip() { yellow "  SKIP  $1"; SKIP=$((SKIP + 1)); }

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    red "Missing required command: $1"
    exit 1
  fi
}

require_cmd curl
require_cmd npm
require_cmd npx

echo "=== Smoke 001 — Core Foundation ==="
echo "API_URL=$API_URL"
echo

# --- Build & lint (V001-01, V001-02, V001-03) ---
echo "[1/7] Build & lint"
if npm run build >/dev/null 2>&1; then
  pass "npm run build"
else
  fail "npm run build"
fi

if npm run lint >/dev/null 2>&1; then
  pass "npm run lint"
else
  fail "npm run lint"
fi

# --- Prisma (V001-05, V001-06, V001-09) ---
echo "[2/7] Prisma migrate & seed"
if npx prisma migrate deploy >/dev/null 2>&1; then
  pass "prisma migrate deploy"
else
  fail "prisma migrate deploy"
fi

if npx prisma db seed >/dev/null 2>&1; then
  pass "prisma db seed"
else
  fail "prisma db seed"
fi

if npx prisma migrate status 2>/dev/null | grep -q "Database schema is up to date"; then
  pass "prisma migrate status (up to date)"
else
  fail "prisma migrate status"
fi

# --- API reachability ---
echo "[3/7] API health"
HEALTH_CODE="$(curl -s -o /tmp/smoke-health.json -w "%{http_code}" "$API_URL/health" || echo "000")"
if [[ "$HEALTH_CODE" == "200" ]]; then
  pass "GET /health → 200"
else
  fail "GET /health → $HEALTH_CODE (is the API running? try: docker compose up -d)"
fi

if [[ -f /tmp/smoke-health.json ]] && grep -q '"status":"up"' /tmp/smoke-health.json; then
  pass "health payload contains status up"
else
  fail "health payload missing status up"
fi

# --- Correlation ID (V001-18, V001-19) ---
echo "[4/7] Correlation ID"
CID_HEADERS="$(curl -s -D - -o /dev/null "$API_URL/health" 2>/dev/null || true)"
if echo "$CID_HEADERS" | grep -qi 'x-correlation-id:'; then
  pass "x-correlation-id header present"
else
  fail "x-correlation-id header missing"
fi

CUSTOM_ID="smoke-test-$(date +%s)"
CID_RESP="$(curl -s -D - -o /dev/null -H "x-correlation-id: $CUSTOM_ID" "$API_URL/health" 2>/dev/null || true)"
if echo "$CID_RESP" | grep -qi "x-correlation-id: $CUSTOM_ID"; then
  pass "custom x-correlation-id echoed"
else
  fail "custom x-correlation-id not echoed"
fi

# --- Standard error (V001-20) ---
echo "[5/7] Standard error response"
ERR_BODY="$(curl -s -X POST "$API_URL/tenants/validate" \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\n%{http_code}" 2>/dev/null || echo -e "\n000")"
ERR_CODE="$(echo "$ERR_BODY" | tail -n1)"
ERR_JSON="$(echo "$ERR_BODY" | sed '$d')"

if [[ "$ERR_CODE" == "400" ]]; then
  pass "POST /tenants/validate invalid body → 400"
else
  fail "POST /tenants/validate → $ERR_CODE (expected 400)"
fi

for field in correlationId timestamp path; do
  if echo "$ERR_JSON" | grep -q "\"$field\""; then
    pass "error body contains $field"
  else
    fail "error body missing $field"
  fi
done

# --- Swagger (V001-23) ---
echo "[6/7] Swagger"
DOCS_CODE="$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/docs" 2>/dev/null || echo "000")"
if [[ "$DOCS_CODE" == "200" || "$DOCS_CODE" == "301" || "$DOCS_CODE" == "302" ]]; then
  pass "GET /docs → $DOCS_CODE"
else
  fail "GET /docs → $DOCS_CODE (expected 200)"
fi

# --- NFR versions (V001-29, V001-30) ---
echo "[7/7] Non-functional checks"
NODE_MAJOR="$(node -v | sed 's/v//' | cut -d. -f1)"
if [[ "$NODE_MAJOR" -ge 20 ]]; then
  pass "Node.js >= 20 ($(node -v))"
else
  fail "Node.js < 20 ($(node -v))"
fi

if node -e "
  const p = require('./package.json');
  const nest = p.dependencies['@nestjs/core'] || '';
  const prisma = (p.devDependencies && p.devDependencies.prisma) || (p.dependencies && p.dependencies.prisma) || '';
  const nestMajor = parseInt(nest.replace(/[^0-9]/g,'').slice(0,2), 10);
  const prismaMajor = parseInt(prisma.replace(/[^0-9]/g,'').slice(0,1), 10);
  if (nestMajor < 10) process.exit(1);
  if (prismaMajor < 5) process.exit(2);
" 2>/dev/null; then
  pass "NestJS 10+ and Prisma 5+ in package.json"
else
  fail "NestJS or Prisma version below minimum"
fi

# --- Summary ---
echo
echo "=== Summary ==="
green "Passed: $PASS"
if [[ "$FAIL" -gt 0 ]]; then red "Failed: $FAIL"; else echo "Failed: $FAIL"; fi
if [[ "$SKIP" -gt 0 ]]; then yellow "Skipped: $SKIP"; fi

if [[ "$FAIL" -gt 0 ]]; then
  red "Smoke 001 FAILED"
  exit 1
fi

green "Smoke 001 PASSED"
exit 0
