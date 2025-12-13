"""Lambda handler for riris events."""

import os
import json
import logging
from datetime import datetime, timedelta
import uuid
from decimal import Decimal
from dateutil import parser as dt_parser, tz
import boto3
from boto3.dynamodb.conditions import Key

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["BACKEND_TABLE"])
# New GSIs
LOCAL_TZ = tz.gettz("Europe/Ljubljana")

def build_response(status_code, body):
    """Builds standardized response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS,GET,POST,PUT,DELETE",
            "Access-Control-Allow-Headers": "Content-Type,Authorization"
        },
        "body": json.dumps(body, default=str)
    }

def is_admin_user(event):
    """Check if the user is a member of Admin group."""
    claims = event.get("requestContext", {}).get("authorizer", {}).get("claims", {})
    groups = claims.get("cognito:groups", "")
    return "Admins" in groups if groups else False

def _get_claims(event) -> dict:
    """Extract JWT claims from API GW authorizer (id_token)."""
    return event.get("requestContext", {}).get("authorizer", {}).get("claims", {}) or {}

def _get_email(event) -> str | None:
    """Prefer 'email' claim; fallback to 'cognito:username' if needed."""
    claims = _get_claims(event)
    return claims.get("email") or claims.get("cognito:username")

def admin_view(event):
    """Returns files view for admin users."""
    if not is_admin_user(event):
        return build_response(403, {"message": "Forbidden: Admin access only"})

    try:
        response = table.query(
            KeyConditionExpression=Key("PK").eq(pk) & Key("SK").begins_with(sk_prefix)
        )
        items = response.get("Items", [])

        if user_id:
            items = [item for item in items if item.get("userId") == user_id]

        return build_response(200, {"message": "Dummy admin return. Replace me."})

    except Exception as e:
        logger.exception("Failed to fetch admin view")
        return build_response(500, {"message": "Internal server error", "error": str(e)})

def user_files_view(event):
    """Returns files view for ordinary users."""

    try:
        return build_response(200, {"message": "Dummy user return. Replace me."})

    except Exception as e:
        logger.exception("Failed to fetch admin view")
        return build_response(500, {"message": "Internal server error", "error": str(e)})

def handler(event, context):     # pylint: disable=unused-argument
    """Lambda handler for this module."""
    logger.info("Received event:\n%s", json.dumps(event, indent=2))
    http_method = event.get("httpMethod", "")
    path = event.get("resource", "")  # use "path" if you're not using resource-based routing

    try:
        # Handle GET /events
        # - Admins: full calendar view (admin_view)
        # - Non-admins: anonymized calendar view (user_calendar_view)
        if http_method == "GET" and path == "/files":
            if is_admin_user(event):
                logger.info("Invoking admin_view (admin)")
                return admin_view(event)
            else:
                logger.info("Invoking user_files_view (non-admin)")
                return user_files_view(event)

        return build_response(405, {"message": "Method not allowed"})
    except Exception as e:
        logger.exception("Unhandled exception in lambda_handler")
        return build_response(500, {"message": "Internal server error", "error": str(e)})
