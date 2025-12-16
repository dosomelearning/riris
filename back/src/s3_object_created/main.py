"""Lambda handler for riris S3 object created events."""

import os
import json
import logging
from datetime import datetime, timezone
import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

logger = logging.getLogger()
logger.setLevel(os.getenv("LOG_LEVEL", "INFO"))

ddb = boto3.resource("dynamodb")
table = ddb.Table(os.environ["BACKEND_TABLE"])

S3_PREFIX = os.environ.get("S3_PREFIX", "files")


def _now_iso() -> str:
    """UTC timestamp in ISO8601 (Z)."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _extract_file_id_from_key(key: str) -> str | None:
    """
    Expect key format: <prefix>/<fileId>
    Return fileId or None if key does not match prefix.
    """
    if not key:
        return None

    # Normalize: allow keys like 'files/<id>' only
    expected_prefix = f"{S3_PREFIX}/"
    if not key.startswith(expected_prefix):
        return None

    file_id = key[len(expected_prefix):]
    if not file_id:
        return None

    # Guard against nested keys
    if "/" in file_id:
        return None

    return file_id


def _mark_ready(file_id: str) -> None:
    """Find DDB record by fileId (GSI1) and mark it ready if currently uploading."""
    resp = table.query(
        IndexName="GSI1",
        KeyConditionExpression=Key("fileId").eq(file_id),
        Limit=1,
    )
    items = resp.get("Items", [])
    if not items:
        logger.warning("No DDB record found for fileId=%s", file_id)
        return

    item = items[0]
    pk = item["PK"]
    sk = item["SK"]

    try:
        table.update_item(
            Key={"PK": pk, "SK": sk},
            UpdateExpression="SET #s = :ready, readyAt = :now",
            ConditionExpression="#s = :uploading",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":ready": "ready",
                ":uploading": "uploading",
                ":now": _now_iso(),
            },
        )
        logger.info("Marked fileId=%s ready (PK=%s, SK=%s)", file_id, pk, sk)

    except ClientError as e:
        code = e.response.get("Error", {}).get("Code", "")
        if code == "ConditionalCheckFailedException":
            # Status was not 'uploading' (already ready/deleted/etc.) – do not treat as error.
            logger.info(
                "Skipping mark-ready for fileId=%s because status was not uploading (PK=%s, SK=%s)",
                file_id, pk, sk
            )
            return

        logger.exception("Failed to update DDB record for fileId=%s", file_id)
        raise


def handler(event, context):  # pylint: disable=unused-argument
    """Lambda handler for S3 object-created events."""
    logger.info("Received event:\n%s", json.dumps(event, indent=2))

    records = event.get("Records", [])
    if not records:
        logger.info("No Records found; nothing to do.")
        return {"ok": True}

    for rec in records:
        try:
            s3_info = rec.get("s3", {})
            obj = s3_info.get("object", {})
            key = obj.get("key", "")

            # S3 may URL-encode the key; boto3 events typically provide raw key, but keep safe:
            # We will not decode here; since our keys are UUIDs, encoding is unlikely.

            file_id = _extract_file_id_from_key(key)
            if not file_id:
                logger.info("Ignoring object key=%s (not matching prefix %s)", key, S3_PREFIX)
                continue

            _mark_ready(file_id)

        except Exception:
            logger.exception("Failed processing record: %s", rec)

    return {"ok": True}
