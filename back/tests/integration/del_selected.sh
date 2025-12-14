#!/usr/bin/env bash
set -euo pipefail

TOKEN_FILE="test-data/id_token.txt"
API_URL_FILE="test-data/api_base_url.txt"

# Seeded fileIds (current test data)
FILE_ID_1="3d0e7c3a-4d5a-4f8d-8f3f-7c2c9e2d6b1a"
FILE_ID_2="9b7b6b8e-2a1e-4c3b-9d7e-4a1c2e3f4b5c"

# Choose which one to delete (default: FILE_ID_1)
TARGET_FILE_ID="${TARGET_FILE_ID:-$FILE_ID_2}"

fail() {
  echo "❌ $1" >&2
  exit 1
}

[[ -f "$API_URL_FILE" ]] || fail "API base URL file not found: $API_URL_FILE"
[[ -f "$TOKEN_FILE" ]]   || fail "Token file not found: $TOKEN_FILE"

API_BASE_URL="$(tr -d '\n' < "$API_URL_FILE")"
ID_TOKEN="$(tr -d '\n' < "$TOKEN_FILE")"

[[ -n "$API_BASE_URL" ]] || fail "API base URL file is empty"
[[ -n "$ID_TOKEN" ]]     || fail "id_token file is empty"
[[ -n "$TARGET_FILE_ID" ]] || fail "TARGET_FILE_ID is empty"

URL="${API_BASE_URL}/files/${TARGET_FILE_ID}"

echo "▶ DELETE $URL"
echo

HTTP_RESPONSE="$(curl -sS -w $'\n%{http_code}' \
  -X DELETE \
  -H "Authorization: $ID_TOKEN" \
  -H "Content-Type: application/json" \
  "$URL")"

HTTP_CODE="$(printf '%s\n' "$HTTP_RESPONSE" | tail -n1)"
HTTP_BODY="$(printf '%s\n' "$HTTP_RESPONSE" | sed '$d')"

echo "HTTP status: $HTTP_CODE"
echo "Response body:"
echo

if command -v jq >/dev/null 2>&1; then
  printf '%s\n' "$HTTP_BODY" | jq
else
  printf '%s\n' "$HTTP_BODY"
fi

echo

[[ "$HTTP_CODE" == "200" ]] || fail "Test failed (expected HTTP 200)"
echo "✅ DELETE /files/${TARGET_FILE_ID} integration test passed"
