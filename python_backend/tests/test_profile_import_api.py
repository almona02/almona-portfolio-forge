"""
Integration tests for the profile import API endpoint.
"""

import os

import pytest
from fastapi.testclient import TestClient

from apis.main import app

client = TestClient(app)


def test_profile_import_endpoint_exists():
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json().get("paths", {})
    assert "/api/v2/profile-import/ingest" in paths


def test_dxf_upload_success():
    test_file = "tests/test_egyptian_60mm.dxf"
    if not os.path.exists(test_file):
        pytest.skip(f"Test file {test_file} not found (run create_test_dxf.py)")

    with open(test_file, "rb") as f:
        files = {"file": ("test_egyptian_60mm.dxf", f, "application/dxf")}
        data = {"source_type": "dxf", "material_type": "aluminium"}
        response = client.post("/api/v2/profile-import/ingest", files=files, data=data)

    assert response.status_code == 200
    result = response.json()
    assert result["status"] == "success"
    assert result["accuracy_score"] == 100.0
    assert result["confidence"] == "certified_cad"
    assert "profile_metrics" in result
    assert "egyptian_context" in result


def test_invalid_dxf_handling():
    test_file = "tests/test_invalid.dxf"
    if not os.path.exists(test_file):
        pytest.skip(f"Test file {test_file} not found (run create_test_dxf.py)")

    with open(test_file, "rb") as f:
        files = {"file": ("invalid.dxf", f, "application/dxf")}
        response = client.post("/api/v2/profile-import/ingest", files=files, data={"source_type": "dxf"})

    # Could be 400 (our error) or 422 (validation)
    assert response.status_code in (400, 422)


def test_missing_file():
    response = client.post("/api/v2/profile-import/ingest", data={"source_type": "dxf"})
    assert response.status_code == 422


def test_pdf_stub():
    test_file = "tests/test_square.dxf"
    if not os.path.exists(test_file):
        pytest.skip(f"Test file {test_file} not found (run create_test_dxf.py)")

    with open(test_file, "rb") as f:
        files = {"file": ("test.pdf", f, "application/pdf")}
        response = client.post("/api/v2/profile-import/ingest", files=files, data={"source_type": "pdf"})

    assert response.status_code == 200
    result = response.json()
    assert result["status"] in ("pending", "error")
