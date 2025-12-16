"""Lambda handler for RIRIS files API."""

import os
import json
import logging
from decimal import Decimal
from datetime import datetime, timezone, timedelta
from dateutil import parser as dt_parser, tz
import uuid

import boto3
from boto3.dynamodb.conditions import Key

DEFAULT_EXPIRES_DAYS = int(os.getenv("DEFAULT_EXPIRES_DAYS", "7"))
MAX_EXPIRES_DAYS = int(os.getenv("MAX_EXPIRES_DAYS", "30"))
PRESIGN_PUT_EXPIRES_SECONDS = int(os.getenv("PRESIGN_PUT_EXPIRES_SECONDS", "900"))
PRESIGN_GET_EXPIRES_SECONDS = int(os.getenv("PRESIGN_GET_EXPIRES_SECONDS", "900"))

UTC = tz.UTC

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

s3 = boto3.client("s3")
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

def build_redirect(location: str):
    """Builds standardized 302 redirect response."""
    return {
        "statusCode": 302,
        "headers": {
            "Location": location,
            "Cache-Control": "no-store",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,Authorization",
        },
        "body": "",
    }


def is_admin_user(event):
    """Check if the user is a member of Admin group."""
    claims = _get_claims(event)
    groups = claims.get("cognito:groups", "")
    # groups can be a comma-delimited string depending on authorizer configuration
    return "Admins" in groups if groups else False

def _get_sub(event) -> str | None:
    """Extract Cognito user sub (stable identity)."""
    claims = _get_claims(event)
    return claims.get("sub")

def _resolve_expiry_days(requested: int | None) -> int:
    """Resolve expiry days with defaults and max clamp."""
    if requested is None:
        days = DEFAULT_EXPIRES_DAYS
    else:
        days = int(requested)
    if days < 1:
        days = 1
    if days > MAX_EXPIRES_DAYS:
        days = MAX_EXPIRES_DAYS
    return days

def _map_file_item(item: dict) -> dict:
    return {
        "fileId": item.get("fileId"),
        "originalFileName": item.get("originalFileName"),
        "contentType": item.get("contentType"),
        "sizeBytes": _to_int(item.get("sizeBytes")),
        "status": item.get("status"),
        "createdAt": item.get("createdAt"),
        "expiresAt": item.get("expiresAt"),
        "passwordRequired": bool(item.get("passwordRequired", False)),
    }

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

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def _parse_iso(ts: str) -> datetime | None:
    # Keep minimal; if you already use dateutil elsewhere, you can swap this.
    try:
        if ts.endswith("Z"):
            ts = ts[:-1] + "+00:00"
        return datetime.fromisoformat(ts)
    except Exception:
        return None

def _is_expired(item: dict) -> bool:
    expires_at = item.get("expiresAt")
    if not expires_at:
        return False
    dt = _parse_iso(str(expires_at))
    return bool(dt and dt <= _now_utc())

def _get_item_by_file_id(file_id: str) -> dict | None:
    """Lookup file metadata by fileId using GSI1 (PK=fileId)."""
    resp = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("fileId").eq(file_id),
        Limit=1,
    )
    items = resp.get("Items", [])
    return items[0] if items else None

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
                    "passwordRequired": bool(item.get("passwordRequired", False)),
                    "downloadCount": _to_int(item.get("downloadCount", 0)),
                    "downloadedAt": item.get("downloadedAt"),
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
#            s3 = boto3.client("s3")
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

def public_download(event):
    """Public download: GET /files/{id} -> 302 redirect to presigned S3 GET."""
    file_id = (event.get("pathParameters") or {}).get("id") or (event.get("pathParameters") or {}).get("fileId")
    if not file_id:
        return build_response(400, {"message": "Missing fileId in path"})

    try:
        item = _get_item_by_file_id(file_id)
        if not item:
            return build_response(404, {"message": "Not found"})

        status = item.get("status")

        # Explicit handling per spec
        if status == "deleted":
            return build_response(403, {"message": "Deleted"})
        if status == "expired" or _is_expired(item):
            return build_response(410, {"message": "Expired"})
        if status != "ready":
            # Conservative: not downloadable yet
            return build_response(404, {"message": "Not found"})

        bucket = os.environ["FILES_BUCKET"]
        s3_prefix = item.get("s3Prefix") or os.getenv("S3_PREFIX", "files")
        object_key = f"{s3_prefix}/{file_id}"

        # Update DDB metrics (best-effort but atomic). Only for ready items.
        try:
            table.update_item(
                Key={"PK": item["PK"], "SK": item["SK"]},
                UpdateExpression="ADD downloadCount :one SET downloadedAt = :now",
                ConditionExpression="#s = :ready",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={
                    ":one": 1,
                    ":now": _now_iso(),
                    ":ready": "ready",
                },
            )
        except Exception:
            # Do not block download if metrics update fails.
            logger.exception("Failed to update download metrics for fileId=%s", file_id)

        url = s3.generate_presigned_url(
            ClientMethod="get_object",
            Params={"Bucket": bucket, "Key": object_key},
            ExpiresIn=int(os.getenv("PRESIGN_GET_EXPIRES_SECONDS", "900")),
        )

        return build_redirect(url)

    except Exception as e:
        logger.exception("Failed public download")
        return build_response(500, {"message": "Internal server error", "error": str(e)})

        return build_redirect(url)

    except Exception as e:
        logger.exception("Failed public download")
        return build_response(500, {"message": "Internal server error", "error": str(e)})

def post_files(event):
    """Initialize upload: create DDB record + return presigned PUT URL."""
    owner_id = _get_sub(event)
    email = _get_email(event)

    if not owner_id:
        return build_response(401, {"message": "Unauthorized"})

    try:
        body = event.get("body") or "{}"
        payload = json.loads(body) if isinstance(body, str) else (body or {})
        original_file_name = payload.get("originalFileName")
        content_type = payload.get("contentType") or "application/octet-stream"
        size_bytes = payload.get("sizeBytes")
        expires_in_days = payload.get("expiresInDays")

        if not original_file_name:
            return build_response(400, {"message": "Missing originalFileName"})
        if size_bytes is None:
            return build_response(400, {"message": "Missing sizeBytes"})

        days = _resolve_expiry_days(expires_in_days)
        created_at = _now_iso()
        expires_at = (
                datetime.now(timezone.utc) + timedelta(days=days)
        ).isoformat().replace("+00:00", "Z")

        file_id = str(uuid.uuid4())
        pk = f"u#{owner_id}"
        sk = f"f#{file_id}"
        s3_prefix = os.environ.get("S3_PREFIX", "files")
        bucket = os.environ["FILES_BUCKET"]
        key = f"{s3_prefix}/{file_id}"

        item = {
            "PK": pk,
            "SK": sk,
            "fileId": file_id,
            "ownerId": owner_id,
            "email": email,
            "s3Prefix": s3_prefix,
            "originalFileName": original_file_name,
            "contentType": content_type,
            "sizeBytes": int(size_bytes),
            "status": "uploading",
            "createdAt": created_at,
            "expiresAt": expires_at,
            # future feature
            "passwordRequired": False,
        }

        table.put_item(Item=item)

        presigned = s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": bucket,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=PRESIGN_PUT_EXPIRES_SECONDS,
        )

        return build_response(200, {
            "fileId": file_id,
            "upload": {
                "method": "PUT",
                "url": presigned,
                "headers": {
                    "Content-Type": content_type
                },
                "expiresInSeconds": PRESIGN_PUT_EXPIRES_SECONDS
            }
        })

    except Exception as e:
        logger.exception("Failed to initialize upload")
        return build_response(500, {"message": "Internal server error", "error": str(e)})

def public_file_metadata(event):
    """Public: return file metadata by fileId (no redirect)."""
    file_id = (event.get("pathParameters") or {}).get("id")
    if not file_id:
        return build_response(400, {"message": "Missing file id"})

    try:
        resp = table.query(
            IndexName="GSI1",
            KeyConditionExpression=Key("fileId").eq(file_id),
            Limit=1,
        )
        items = resp.get("Items", [])
        if not items:
            return build_response(404, {"message": "Not found"})

        item = items[0]
        status = item.get("status")
        expires_at = item.get("expiresAt")

        # Deleted: keep your semantics (you already use 403)
        if status == "deleted":
            return build_response(403, {"message": "Deleted"})

        # Expired logic: if expiresAt exists and is in the past => 410
        if expires_at:
            try:
                exp_dt = dt_parser.isoparse(expires_at)
                if exp_dt <= datetime.now(timezone.utc):
                    return build_response(410, {"message": "Expired"})
            except Exception:
                # If expiresAt is malformed, treat as server error
                logger.exception("Invalid expiresAt format")
                return build_response(500, {"message": "Internal server error"})

        return build_response(200, _map_file_item(item))

    except Exception as e:
        logger.exception("Failed to fetch public metadata")
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

        # 7.x POST /files (init upload)
        if http_method == "POST" and path == "/files":
            logger.info("Invoking post_files")
            return post_files(event)

        # Public metadata: GET /public/files/{id}
        if http_method == "GET" and path == "/public/files/{id}":
            logger.info("Invoking public_file_metadata")
            return public_file_metadata(event)

        # 7.4 DELETE /files/{id}
        if http_method == "DELETE" and path == "/files/{id}":
            logger.info("Invoking delete_file")
            return delete_file(event)

        # 7.5 Public download: GET /files/{id}
        if http_method == "GET" and path == "/files/{id}":
            logger.info("Invoking public_download")
            return public_download(event)

        return build_response(405, {"message": "Method not allowed"})

    except Exception as e:
        logger.exception("Unhandled exception in handler")
        return build_response(500, {"message": "Internal server error", "error": str(e)})
