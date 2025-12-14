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

echo "▶ GET (no-follow) $URL"
echo

# Show headers, no body, no redirect following
HEADERS="$(curl -sS -D - -o /dev/null "$URL")"

STATUS_LINE="$(printf '%s\n' "$HEADERS" | head -n1)"
LOCATION="$(printf '%s\n' "$HEADERS" | awk -F': ' 'tolower($1)=="location"{print $2}' | tr -d '\r')"

echo "$STATUS_LINE"
echo "Location: ${LOCATION:-<missing>}"
echo

# Assert 302 + Location present
echo "$STATUS_LINE" | grep -q " 302 " || fail "Expected HTTP 302"
[[ -n "$LOCATION" ]] || fail "Expected Location header"

echo "✅ Public download returned 302 + Location"

echo
echo "▶ GET (follow redirect, discard bytes)"
echo

# Follow redirect but discard downloaded content
curl -sS -L -o /dev/null "$URL"

echo "✅ Redirect-follow succeeded"
