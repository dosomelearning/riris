"""Lambda handler for RIRIS files API."""

import os
import json
import logging
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key


logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["BACKEND_TABLE"])


def build_response(status_code, body):
    """Builds standardized response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": json.dumps(body, default=str),
    }


def is_admin_user(event):
    """Check if the user is a member of Admin group."""
    claims = _get_claims(event)
    groups = claims.get("cognito:groups", "")
    # groups can be a comma-delimited string depending on authorizer configuration
    return "Admins" in groups if groups else False


def _to_int(v):
    """Convert DynamoDB numeric types (Decimal) to int for JSON response."""
    if v is None:
        return None
    if isinstance(v, Decimal):
        return int(v)
    if isinstance(v, (int, float)):
        return int(v)
    # fallback: try parsing string
    try:
        return int(v)
    except (TypeError, ValueError):
        return None

def _get_claims(event) -> dict:
    """Extract JWT claims from API GW authorizer (id_token)."""
    return event.get("requestContext", {}).get("authorizer", {}).get("claims", {}) or {}


def _get_owner_id(event) -> str | None:
    """Return stable ownerId from JWT claims (Cognito sub)."""
    claims = _get_claims(event)
    return claims.get("sub")


def _get_email(event) -> str | None:
    """Prefer 'email' claim; fallback to 'cognito:username' if needed."""
    claims = _get_claims(event)
    return claims.get("email") or claims.get("cognito:username")


def admin_view(event):
    """Returns files view for admin users.

    Note: Not part of RIRIS base spec (7.3 is 'list my files').
    Keep as explicit extension.
    """
    if not is_admin_user(event):
        return build_response(403, {"message": "Forbidden: Admin access only"})

    # We intentionally do not implement "list all users' files" here yet.
    # That requires a different access pattern / index (or a scan) and is out of spec.
    return build_response(501, {"message": "Not implemented for admins (out of scope for 7.3)"})


def user_files_view(event):
    """Returns files view for ordinary users (GET /files)."""
    owner_id = _get_owner_id(event)
    if not owner_id:
        return build_response(401, {"message": "Unauthorized"})

    pk = f"u#{owner_id}"
    sk_prefix = "f#"

    try:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with(sk_prefix)
        )
        items = response.get("Items", [])

        # Shape the output strictly per spec 7.3
        out_items = []
        for item in items:
            out_items.append(
                {
                    "fileId": item.get("fileId"),
                    "originalFileName": item.get("originalFileName"),
                    "contentType": item.get("contentType"),
                    "sizeBytes": _to_int(item.get("sizeBytes")),
                    "status": item.get("status"),
                    "createdAt": item.get("createdAt"),
                    "expiresAt": item.get("expiresAt"),
                }
            )

        return build_response(200, {"items": out_items})

    except Exception as e:
        logger.exception("Failed to fetch user files view")
        return build_response(500, {"message": "Internal server error", "error": str(e)})


def handler(event, context):  # pylint: disable=unused-argument
    """Lambda handler for this module."""
    logger.info("Received event:\n%s", json.dumps(event, indent=2))
    http_method = event.get("httpMethod", "")
    path = event.get("resource", "")

    try:
        # Preflight CORS
        if http_method == "OPTIONS":
            return build_response(200, {"message": "ok"})

        # 7.3 GET /files
        if http_method == "GET" and path == "/files":
            logger.info("Invoking user_files_view (non-admin)")
            return user_files_view(event)

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        logger.exception("Unhandled exception in handler")
        return build_response(500, {"message": "Internal server error", "error": str(e)})
