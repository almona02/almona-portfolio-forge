"""Regression: Python refresh must re-resolve role from profiles, not copy JWT role."""
from __future__ import annotations

import asyncio
import importlib.util
import sys
import time
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException


USER_ID = "e2000000-0000-4000-8000-000000000099"
EMAIL = "staging.s53.admin@almona.test"


@pytest.fixture
def auth_mod(monkeypatch):
    config = ModuleType("core.config")
    config.settings = SimpleNamespace(
        JWT_SECRET_KEY="jwt-regression-secret-at-least-48-bytes-for-HS384-tests",
        ACCESS_TOKEN_EXPIRE_MINUTES=15,
    )
    supabase = ModuleType("core.supabase_client")
    client = MagicMock()
    supabase.supabase_client = MagicMock(client=client)
    logger = ModuleType("core.security_logger")
    logger.SecurityLogger = MagicMock()
    logger.SecurityEventType = MagicMock()
    logger.SecurityEvent = MagicMock()
    for module in (config, supabase, logger):
        monkeypatch.setitem(sys.modules, module.__name__, module)

    root = Path(__file__).resolve().parents[1]
    spec = importlib.util.spec_from_file_location(
        "jwt_refresh_auth", root / "apis/v2/auth_fastapi.py"
    )
    module = importlib.util.module_from_spec(spec)
    monkeypatch.setitem(sys.modules, "jwt_refresh_auth", module)
    spec.loader.exec_module(module)
    return module, client, config.settings


def _set_profile_role(client: MagicMock, role: str | None) -> None:
    result = MagicMock()
    result.data = [{"role": role}] if role is not None else []
    (
        client.table.return_value.select.return_value.eq.return_value.limit.return_value.execute
    ).return_value = result


def _decode(settings, token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])


def test_refresh_resolves_current_role_not_stale_claim(auth_mod):
    auth, client, settings = auth_mod
    # Refresh JWT still claims admin, but profiles now say customer.
    stale = auth.create_refresh_token(
        auth.build_token_claims(user_id=USER_ID, email=EMAIL, role="admin")
    )
    _set_profile_role(client, "customer")

    out = asyncio.run(auth.refresh_access_token(stale))
    claims = _decode(settings, out["access_token"])
    assert claims["sub"] == USER_ID
    assert claims["id"] == USER_ID
    assert claims["email"] == EMAIL
    assert claims["role"] == "customer"
    assert claims["type"] == "access"

    refresh_claims = _decode(settings, out["refresh_token"])
    assert refresh_claims["role"] == "customer"
    assert refresh_claims["type"] == "refresh"


def test_refresh_rejects_missing_profile_role(auth_mod):
    auth, client, _ = auth_mod
    token = auth.create_refresh_token(
        auth.build_token_claims(user_id=USER_ID, email=EMAIL, role="admin")
    )
    _set_profile_role(client, None)

    with pytest.raises(HTTPException) as err:
        asyncio.run(auth.refresh_access_token(token))
    assert err.value.status_code == 401


def test_refresh_rejects_invalid_and_access_tokens(auth_mod):
    auth, client, settings = auth_mod
    _set_profile_role(client, "admin")

    with pytest.raises(HTTPException):
        asyncio.run(auth.refresh_access_token("not-a-jwt"))

    access = auth.create_access_token(
        auth.build_token_claims(user_id=USER_ID, email=EMAIL, role="admin")
    )
    with pytest.raises(HTTPException):
        asyncio.run(auth.refresh_access_token(access))

    expired = jwt.encode(
        {
            "sub": USER_ID,
            "id": USER_ID,
            "email": EMAIL,
            "role": "admin",
            "type": "refresh",
            "exp": int(time.time()) - 60,
        },
        settings.JWT_SECRET_KEY,
        algorithm="HS256",
    )
    with pytest.raises(HTTPException):
        asyncio.run(auth.refresh_access_token(expired))


def test_refresh_preserves_uuid_identity_for_ticket_actor(auth_mod):
    auth, client, settings = auth_mod
    _set_profile_role(client, "support")
    token = auth.create_refresh_token(
        auth.build_token_claims(user_id=USER_ID, email=EMAIL, role="support")
    )
    out = asyncio.run(auth.refresh_access_token(token))
    claims = _decode(settings, out["access_token"])
    assert claims["sub"] == USER_ID
    assert claims["id"] == USER_ID
    assert claims["role"] == "support"
