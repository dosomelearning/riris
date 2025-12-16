#!/usr/bin/env bash
set -euo pipefail

API_URL_FILE="test-data/api_base_url.txt"

# Seeded fileIds (your current test data)
FILE_ID_1="3d0e7c3a-4d5a-4f8d-8f3f-7c2c9e2d6b1a"
FILE_ID_2="9b7b6b8e-2a1e-4c3b-9d7e-4a1c2e3f4b5c"

# Choose which one to download (default: FILE_ID_1)
TARGET_FILE_ID="${TARGET_FILE_ID:-$FILE_ID_1}"

fail() { echo "❌ $1" >&2; exit 1; }

[[ -f "$API_URL_FILE" ]] || fail "API base URL file not found: $API_URL_FILE"
API_BASE_URL="$(tr -d '\n' < "$API_URL_FILE")"
[[ -n "$API_BASE_URL" ]] || fail "API base URL file is empty"

URL="${API_BASE_URL}/files/${TARGET_FILE_ID}"

echo "▶ GET (follow redirect once; discard bytes) $URL"
echo

# Single request:
# -L follows redirect(s)
# -o /dev/null discards bytes
# -sS silent but shows errors
# -w prints: final status code, redirect count, final URL
OUT="$(
  curl -sS -L -o /dev/null \
    -w "final_http=%{http_code}\nredirects=%{num_redirects}\nfinal_url=%{url_effective}\n" \
    "$URL"
)"

echo "$OUT"
echo

FINAL_HTTP="$(printf '%s\n' "$OUT" | awk -F= '$1=="final_http"{print $2}')"
REDIRECTS="$(printf '%s\n' "$OUT" | awk -F= '$1=="redirects"{print $2}')"
FINAL_URL="$(printf '%s\n' "$OUT" | awk -F= '$1=="final_url"{print $2}')"

[[ -n "$FINAL_HTTP" ]] || fail "Could not parse final_http"
[[ -n "$REDIRECTS" ]] || fail "Could not parse redirects"

# Expect at least one redirect (API -> S3 presigned)
[[ "$REDIRECTS" -ge 1 ]] || fail "Expected at least 1 redirect (got $REDIRECTS)"

# Final should be 200 (S3 object fetch)
[[ "$FINAL_HTTP" == "200" ]] || fail "Expected final HTTP 200, got $FINAL_HTTP"

echo "✅ Public download succeeded via redirect(s)=${REDIRECTS} (final: ${FINAL_HTTP})"
echo "✅ Final URL: ${FINAL_URL}"
