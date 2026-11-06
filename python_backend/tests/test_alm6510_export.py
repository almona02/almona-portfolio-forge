"""
Tests for ALM 6510 Export All-Or-Nothing Behavior (F02)
========================================================

A production export must never silently drop cuts: any malformed or
unconvertible cut rejects the entire export with HTTP 400. The payload is
intermediate JSON, explicitly marked as not controller-ready.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from apis.v2.alm6510_export import INTERMEDIATE_FORMAT, router  # noqa: E402


app = FastAPI()
app.include_router(router, prefix="/api/v2")
client = TestClient(app)

URL = "/api/v2/alm6510/generate-mdb"
DETAIL_KEY = "detail"


def _cut(**overrides):
    cut = {
        "length": 1500,
        "angle": 90,
        "barIndex": 1,
        "componentId": "frame_top",
        "profile": {"name": "Frame 60", "code": "FR60", "material": "aluminum"},
    }
    cut.update(overrides)
    return cut


def _payload(cutting_plan):
    return {
        "orderNumber": "ORDER-1",
        "customerCode": "C1",
        "customerName": "Customer",
        "cuttingPlan": cutting_plan,
        "profiles": [],
        "project": {"positionNumber": 1},
    }


class TestAllOrNothingExport:
    """One bad cut rejects the whole export — no partial files."""

    def test_rejects_mixed_valid_and_invalid_cuts(self):
        response = client.post(
            URL, json=_payload([_cut(), _cut(length=0, componentId="bad")])
        )
        assert response.status_code == 400
        detail = response.json()[DETAIL_KEY]
        assert "all-or-nothing" in detail
        assert "bad" in detail

    def test_rejects_malformed_entries_instead_of_dropping_them(self):
        # Non-object entries fail request validation: rejected, no file.
        response = client.post(
            URL, json=_payload([_cut(), "not-a-cut", 42])
        )
        assert response.status_code == 422

    def test_programmatic_malformed_entries_rejected_all_or_nothing(self):
        # Defense in depth for direct Python callers bypassing validation.
        import asyncio

        from fastapi import HTTPException

        from apis.v2.alm6510_export import (
            ALM6510ExportRequest,
            generate_alm6510_mdb,
        )

        request = ALM6510ExportRequest.model_construct(
            orderNumber="ORDER-1",
            customerCode="C1",
            customerName="Customer",
            cuttingPlan=[_cut(), "not-a-cut"],
            profiles=[],
            project={"positionNumber": 1},
        )
        try:
            asyncio.run(generate_alm6510_mdb(request))
        except HTTPException as exc:
            assert exc.status_code == 400
            assert "malformed" in exc.detail
            assert "no partial file" in exc.detail
        else:
            raise AssertionError("expected HTTP 400 for malformed entries")

    def test_rejects_empty_plan(self):
        response = client.post(URL, json=_payload([]))
        assert response.status_code == 400


class TestBinaryMdbFile:
    """Binary endpoint: same records, real bytes or honest 501."""

    FILE_URL = "/api/v2/alm6510/generate-mdb-file"

    def test_unavailable_writer_returns_501_with_guidance(self, monkeypatch):
        import services.alm6510_mdb_writer as writer_module
        from services.alm6510_mdb_writer import MdbUnavailableError

        def _missing(records, dest, template=None):
            raise MdbUnavailableError("driver-missing", "install the engine")

        monkeypatch.setattr(writer_module, "write_mdb", _missing)
        response = client.post(self.FILE_URL, json=_payload([_cut()]))
        assert response.status_code == 501
        assert "Binary MDB export unavailable" in response.json()[DETAIL_KEY]
        assert "install the engine" in response.json()[DETAIL_KEY]

    def test_success_returns_binary_with_acceptance_header(self, monkeypatch):
        import services.alm6510_mdb_writer as writer_module

        def _ok(records, dest, template=None):
            assert len(records) == 2
            dest.write_bytes(b"fake-mdb-bytes")
            return dest

        monkeypatch.setattr(writer_module, "write_mdb", _ok)
        response = client.post(self.FILE_URL, json=_payload([_cut(), _cut()]))
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/x-msaccess"
        assert response.headers["X-Export-Format"] == "mdb-binary-jet"
        assert response.headers["X-MDB-Records"] == "2"
        assert response.headers["X-Controller-Acceptance"] == "required"
        assert ".mdb" in response.headers["content-disposition"]
        assert response.content == b"fake-mdb-bytes"

    def test_all_or_nothing_applies_to_binary_too(self, monkeypatch):
        import services.alm6510_mdb_writer as writer_module

        calls = []
        monkeypatch.setattr(
            writer_module, "write_mdb", lambda *a, **k: calls.append(True)
        )
        response = client.post(
            self.FILE_URL, json=_payload([_cut(), _cut(length=0)])
        )
        assert response.status_code == 400
        assert calls == []


class TestIntermediateFormatLabeling:
    """Success payloads are honestly marked as intermediate JSON."""

    def test_valid_export_marks_format_and_controller_readiness(self):
        response = client.post(URL, json=_payload([_cut(), _cut()]))
        assert response.status_code == 200
        assert response.headers["X-Export-Format"] == INTERMEDIATE_FORMAT
        assert response.headers["X-MDB-Records"] == "2"
        body = response.json()
        assert body["format"] == INTERMEDIATE_FORMAT
        assert body["controllerReady"] is False
        assert "warning" in body
        assert len(body["rows"]) == 2
