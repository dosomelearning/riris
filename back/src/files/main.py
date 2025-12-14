"""Lambda handler for RIRIS files API."""

import os
import json
import logging
from decimal import Decimal
from datetime import datetime, timezone

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

def _get_path_param_file_id(event) -> str | None:
    """Extract fileId from pathParameters."""
    return (event.get("pathParameters") or {}).get("id") or (event.get("pathParameters") or {}).get("fileId")

def _now_iso() -> str:
    """UTC timestamp in ISO8601."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

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

def delete_file(event):
    """Deletes a file (owner-only). Implements DELETE /files/{id}."""
    owner_id = _get_owner_id(event)
    if not owner_id:
        return build_response(401, {"message": "Unauthorized"})

    file_id = _get_path_param_file_id(event)
    if not file_id:
        return build_response(400, {"message": "Missing fileId in path"})

    pk = f"u#{owner_id}"
    sk = f"f#{file_id}"

    try:
        # Owner check is implicit: only fetch within caller's partition.
        resp = table.get_item(Key={"PK": pk, "SK": sk})
        item = resp.get("Item")
        if not item:
            # Not found under caller -> not allowed to delete
            return build_response(403, {"message": "Forbidden: owner access only"})

        # If already deleted, treat as idempotent delete
        status = item.get("status")
        s3_prefix = item.get("s3Prefix") or os.getenv("S3_PREFIX", "files")
        bucket = os.environ.get("FILES_BUCKET")
        object_key = f"{s3_prefix}/{file_id}"

        # Delete from S3 (best-effort idempotent; deleting non-existing is not fatal)
        if bucket:
            s3 = boto3.client("s3")
            try:
                s3.delete_object(Bucket=bucket, Key=object_key)
            except Exception:
                logger.exception("Failed to delete S3 object: s3://%s/%s", bucket, object_key)
                # If S3 delete fails, we should not mark DDB deleted.
                return build_response(500, {"message": "Internal server error", "error": "Failed to delete S3 object"})

        # Update DDB status -> deleted
        # (Spec requires status updated to deleted; we also set deletedAt for traceability.)
        table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression="SET #st = :deleted, deletedAt = :ts",
            ExpressionAttributeNames={"#st": "status"},
            ExpressionAttributeValues={":deleted": "deleted", ":ts": _now_iso()},
        )

        return build_response(200, {"message": "deleted", "fileId": file_id})

    except Exception as e:
        logger.exception("Failed to delete file")
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

        # 7.4 DELETE /files/{id}
        if http_method == "DELETE" and path == "/files/{id}":
            logger.info("Invoking delete_file")
            return delete_file(event)

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        logger.exception("Unhandled exception in handler")
        return build_response(500, {"message": "Internal server error", "error": str(e)})
