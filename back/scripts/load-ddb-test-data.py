#!/usr/bin/env python3
import boto3
import json
import os
import sys

# Config (edit these)
PROFILE = "dev"
REGION = "eu-central-1"
TABLE_NAME = "riris-backend-files-data"
DATA_FILE = os.path.join("test-data", "ddb-test-data.json")


def main() -> int:
    # Session + DynamoDB
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    ddb = session.resource("dynamodb")
    table = ddb.Table(TABLE_NAME)

    # Load seed data (must be a JSON array)
    try:
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            items = json.load(f)
        if not isinstance(items, list):
            raise ValueError("Seed file must contain a JSON array of items")
    except Exception as e:
        print(f"❌ Failed to load test data file '{DATA_FILE}': {e}", file=sys.stderr)
        return 1

    # Insert
    ok = 0
    for i, item in enumerate(items, start=1):
        try:
            table.put_item(Item=item)
            ok += 1
        except Exception as e:
            pk = item.get("PK", "?")
            sk = item.get("SK", "?")
            print(f"❌ put_item failed for item #{i} ({pk} | {sk}): {e}", file=sys.stderr)
            return 1

    print(f"✅ Loaded {ok} items into table '{TABLE_NAME}'.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
