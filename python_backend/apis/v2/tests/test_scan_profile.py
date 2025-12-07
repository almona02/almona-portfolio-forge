import io

import cv2
import numpy as np
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import apis.v2.scan_profile as scan_profile
from apis.v2.deps import get_current_user, get_industrial_supabase


class _DummySupabase:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def _test_image_bytes() -> bytes:
    """Create a simple black-rectangle-on-white PNG for scanning."""
    img = np.full((120, 80, 3), 255, dtype=np.uint8)
    cv2.rectangle(img, (20, 20), (60, 100), (0, 0, 0), thickness=-1)
    ok, buf = cv2.imencode(".png", img)
    assert ok
    return buf.tobytes()


@pytest.fixture
def client(monkeypatch):
    # Minimal app to avoid importing unrelated routers with syntax issues
    app = FastAPI()
    app.include_router(scan_profile.router)

    # Override dependencies
    async def _supabase_override():
        yield _DummySupabase()

    app.dependency_overrides[get_current_user] = lambda: {"sub": "test-user"}
    app.dependency_overrides[get_industrial_supabase] = _supabase_override

    # Stub storage uploads
    monkeypatch.setattr(
        scan_profile,
        "upload_scan_artifacts",
        lambda **kwargs: {"photo_url": "photo-url", "svg_url": "svg-url"},
    )

    client = TestClient(app)
    yield client


def test_scan_profile_success(client):
    files = {"file": ("profile.png", _test_image_bytes(), "image/png")}
    resp = client.post("/scan/profile", files=files)

    assert resp.status_code == 200
    data = resp.json()
    assert data["svgPath"]
    assert data["dimensions"]["width_px"] > 0
    assert data["dimensions"]["height_px"] > 0
    assert data["storage"]["photo_url"] == "photo-url"
    assert data["storage"]["svg_url"] == "svg-url"


def test_scan_profile_rejects_non_image(client):
    files = {"file": ("profile.txt", b"not-an-image", "text/plain")}
    resp = client.post("/scan/profile", files=files)

    assert resp.status_code == 400
    assert "Invalid file type" in resp.json()["detail"]

