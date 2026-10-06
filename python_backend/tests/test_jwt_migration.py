"""Exercise the JWT handlers without live Supabase or application startup."""
import asyncio
import importlib.util
import sys
import time
from pathlib import Path
from types import ModuleType, SimpleNamespace
from unittest.mock import MagicMock

import jwt
import pytest
from fastapi import HTTPException, Request


@pytest.fixture
def handlers(monkeypatch):
    config = ModuleType("core.config")
    config.settings = SimpleNamespace(
        JWT_SECRET_KEY="jwt-regression-secret-at-least-48-bytes-for-HS384-tests",
        ACCESS_TOKEN_EXPIRE_MINUTES=15,
    )
    supabase = ModuleType("core.supabase_client")
    supabase.supabase_client = MagicMock()
    logger = ModuleType("core.security_logger")
    logger.SecurityLogger = MagicMock()
    logger.SecurityEventType = MagicMock()
    logger.SecurityEvent = MagicMock()
    for module in (config, supabase, logger):
        monkeypatch.setitem(sys.modules, module.__name__, module)

    root = Path(__file__).resolve().parents[1]
    modules = []
    for name, path in (
        ("jwt_test_auth", "apis/v2/auth_fastapi.py"),
        ("jwt_test_limits", "apis/v2/middleware/rate_limiting.py"),
    ):
        spec = importlib.util.spec_from_file_location(name, root / path)
        module = importlib.util.module_from_spec(spec)
        monkeypatch.setitem(sys.modules, name, module)
        spec.loader.exec_module(module)
        modules.append(module)
    return *modules, config.settings


def test_access_and_refresh_round_trip(handlers):
    auth, _, _ = handlers
    access = auth.create_access_token({"sub": "workshop-user"})
    assert asyncio.run(auth.get_current_user(access)).username == "workshop-user"
    refreshed = asyncio.run(auth.refresh_access_token(
        auth.create_refresh_token({"sub": "workshop-user"})
    ))
    assert asyncio.run(auth.get_current_user(refreshed["access_token"])).username == "workshop-user"
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.get_current_user(refreshed["refresh_token"]))
    assert error.value.status_code == 401
    with pytest.raises(HTTPException):
        asyncio.run(auth.refresh_access_token(access))


@pytest.mark.parametrize("kind", ["expired", "signature", "algorithm", "malformed"])
def test_invalid_tokens_are_rejected_by_auth_and_rate_limits(handlers, kind):
    auth, limits, settings = handlers
    payload = {"sub": "workshop-user", "type": "access", "exp": int(time.time()) + 60}
    key = settings.JWT_SECRET_KEY
    algorithm = "HS256"
    if kind == "expired":
        payload["exp"] = int(time.time()) - 60
    elif kind == "signature":
        key = "different-secret-at-least-32-bytes"
    elif kind == "algorithm":
        algorithm = "HS384"
    token = "invalid.jwt" if kind == "malformed" else jwt.encode(payload, key, algorithm=algorithm)
    with pytest.raises(HTTPException) as error:
        asyncio.run(auth.get_current_user(token))
    assert error.value.status_code == 401
    request = Request({"type": "http", "headers": [(b"authorization", f"Bearer {token}".encode())]})
    middleware = limits.V2RateLimitMiddleware.__new__(limits.V2RateLimitMiddleware)
    assert middleware._extract_user_from_token(request) is None


def test_valid_access_token_keeps_authenticated_rate_limit_identity(handlers):
    auth, limits, _ = handlers
    token = auth.create_access_token({"sub": "workshop-user"})
    request = Request({"type": "http", "headers": [(b"authorization", f"Bearer {token}".encode())]})
    middleware = limits.V2RateLimitMiddleware.__new__(limits.V2RateLimitMiddleware)
    assert middleware._extract_user_from_token(request) == "workshop-user"
