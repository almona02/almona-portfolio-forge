"""
End-to-end verification runner for CAD import.

Runs lightweight checks without pulling full test suite (avoids heavy deps).
Steps:
1) Generate test DXFs
2) Validate cad_ingest on square and invalid input
3) Validate profile-import endpoint via minimal FastAPI app
"""

import os
import subprocess
import sys

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.cad_ingest import CadProfileIngestor
from apis.v2.profile_import import router as profile_import_router


def run(cmd, cwd=None):
    print(f"-> Running: {' '.join(cmd)}")
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)


def ensure_files():
    print("1) Creating test DXF files...")
    gen = run([sys.executable, "tests/create_test_dxf.py"])
    if gen.returncode != 0:
        print(gen.stdout)
        print(gen.stderr)
        raise SystemExit(1)


def check_ingest():
    print("2) Checking cad_ingest metrics...")
    ingestor = CadProfileIngestor()

    with open("tests/test_square.dxf", "rb") as f:
        data = f.read()
    res = ingestor.process_dxf(data)
    assert res["status"] == "success", res
    metrics = res["profile_metrics"]
    assert abs(metrics["area_mm2"] - 10000.0) < 0.1
    assert abs(metrics["perimeter_mm"] - 400.0) < 0.1
    assert metrics["is_closed"] is True

    res_bad = ingestor.process_dxf(b"")
    assert res_bad["status"] == "error"
    print("   cad_ingest OK")


def check_api():
    print("3) Checking profile-import endpoint (minimal app)...")
    app = FastAPI()
    app.include_router(profile_import_router, prefix="/api/v2")
    client = TestClient(app)

    spec = client.get("/openapi.json").json()
    paths = spec.get("paths", {})
    assert "/api/v2/profile-import/ingest" in paths

    with open("tests/test_egyptian_60mm.dxf", "rb") as f:
        files = {"file": ("test_egyptian_60mm.dxf", f, "application/dxf")}
        data = {"source_type": "dxf", "material_type": "aluminium"}
        resp = client.post("/api/v2/profile-import/ingest", files=files, data=data)

    assert resp.status_code == 200, resp.text
    payload = resp.json()
    assert payload["status"] == "success"
    assert payload["accuracy_score"] == 100.0
    assert payload["confidence"] == "certified_cad"
    print("   profile-import endpoint OK")


def main() -> int:
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    try:
        ensure_files()
        check_ingest()
        check_api()
    except AssertionError as exc:
        print(f"Assertion failed: {exc}")
        return 1
    except Exception as exc:  # pragma: no cover - defensive
        print(f"Error: {exc}")
        return 1

    print("\nAll verifications passed.")
    print("CAD import system ready (DXF path).")
    print("Endpoint registered and responding.")
    print(
        'Optional manual curl: curl -X POST "http://localhost:8001/api/v2/profile-import/ingest" '
        '-F "file=@tests/test_egyptian_60mm.dxf" -F "source_type=dxf" '
        '-F "material_type=aluminium"'
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
