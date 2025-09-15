"""Dependency stubs for FastAPI routes.

If a real implementation already exists elsewhere, replace imports in routes
to point to it and delete this stub. These functions are minimal placeholders
to keep module imports resolvable during incremental development.
"""
from __future__ import annotations

from typing import Any, Dict

from supabase import Client, create_client  # type: ignore
import os


_supabase_client: Client | None = None


def get_supabase() -> Client:  # pragma: no cover - trivial accessor
    global _supabase_client
    if _supabase_client is None:
        url = os.getenv("SUPABASE_URL", "http://localhost")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "public-anon-key")
        _supabase_client = create_client(url, key)
    return _supabase_client


def get_current_user() -> Dict[str, Any]:  # pragma: no cover - placeholder
    # In production this would extract and validate a JWT / session.
    # Returning a deterministic anonymous-like user id for now.
    return {
        "id": os.getenv(
            "DEMO_USER_ID", "00000000-0000-0000-0000-000000000000"
        ),
        "role": "admin",
    }
