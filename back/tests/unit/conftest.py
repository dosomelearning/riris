import importlib
import os
import sys
from types import SimpleNamespace

import pytest


class _DummyTable:
    """Stub DynamoDB Table used by unit tests."""
    def query(self, **kwargs):  # pragma: no cover
        return {"Items": []}


class _DummyDdbResource:
    """Stub DynamoDB resource used by unit tests."""
    def Table(self, name):  # noqa: N802 (boto3 naming)
        return _DummyTable()


@pytest.fixture()
def lambda_main(monkeypatch):
    """
    Imports back/src/files/main.py with boto3 patched so module import has no AWS side effects.
    Returns the imported module object.
    """
    # Ensure required env is set before import (main.py reads BACKEND_TABLE at import time)
    monkeypatch.setenv("BACKEND_TABLE", "dummy-table")
    monkeypatch.setenv("LOG_LEVEL", "INFO")

    # Patch boto3.resource BEFORE importing main.py
    import boto3
    monkeypatch.setattr(boto3, "resource", lambda service_name: _DummyDdbResource())

    # Ensure we can import main.py from back/src/files
    # (CI runs with working-directory=back; adjust if your CI differs)
    files_dir = os.path.join(os.getcwd(), "src", "files")
    if files_dir not in sys.path:
        sys.path.insert(0, files_dir)

    # Import (or reload) the module under test
    if "main" in sys.modules:
        mod = importlib.reload(sys.modules["main"])
    else:
        mod = importlib.import_module("main")

    return mod
