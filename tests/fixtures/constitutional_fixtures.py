"""
Constitutional test fixtures for fake capture testing.
"""

from datetime import datetime, timedelta
from typing import Dict, Any
import json

from realityos_core.capture_gateway.gateway_skeleton import CaptureData


def create_valid_capture_data() -> CaptureData:
    """Create constitutionally valid capture data for testing."""
    return CaptureData(
        qr_data=json.dumps({
            "v": 1,
            "entity_id": "asset_123",
            "vertical_id": "maintenance_vertical",
            "qr_id": "qr_20250220_103000",
            "created_at": "2025-02-20T10:30:00Z",
            "valid_from": "2025-02-20T10:30:00Z",
            "valid_to": "2025-02-21T10:30:00Z",
            "signature": "test_signature_placeholder"
        }),
        photos=[b"fake_photo_1", b"fake_photo_2"],
        gps_latitude=40.7128,
        gps_longitude=-74.0060,
        gps_accuracy_meters=10.0,
        timestamp=datetime(2025, 2, 20, 10, 30, 0),
        verified_by="operator_001",
        entity_id="asset_123",
        vertical_id="maintenance_vertical"
    )


def create_constitutional_violation_data() -> Dict[str, Any]:
    """Create data that should trigger constitutional violations."""
    return {
        "empty_qr": CaptureData(
            qr_data="{}",
            photos=[],
            gps_latitude=0.0,
            gps_longitude=0.0,
            gps_accuracy_meters=None,
            timestamp=datetime.utcnow(),
            verified_by="",
            entity_id="",
            vertical_id=""
        ),
        "too_many_photos": CaptureData(
            qr_data=json.dumps({
                "v": 1,
                "entity_id": "test",
                "vertical_id": "test_vertical",
                "qr_id": "test_qr",
                "created_at": datetime.utcnow().isoformat(),
                "valid_from": datetime.utcnow().isoformat(),
                "valid_to": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "signature": "test_sig"
            }),
            photos=[b"photo"] * 4,  # 4 photos > MAX_PHOTOS
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.0,
            timestamp=datetime.utcnow(),
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical"
        ),
        "future_timestamp": CaptureData(
            qr_data=json.dumps({
                "v": 1,
                "entity_id": "test",
                "vertical_id": "test_vertical",
                "qr_id": "test_qr",
                "created_at": datetime.utcnow().isoformat(),
                "valid_from": datetime.utcnow().isoformat(),
                "valid_to": (datetime.utcnow() + timedelta(hours=24)).isoformat(),
                "signature": "test_sig"
            }),
            photos=[b"photo"],
            gps_latitude=40.7128,
            gps_longitude=-74.0060,
            gps_accuracy_meters=10.0,
            timestamp=datetime.utcnow() + timedelta(days=1),  # Future
            verified_by="operator_001",
            entity_id="asset_123",
            vertical_id="maintenance_vertical"
        )
    }


def get_vertical_secrets() -> Dict[str, str]:
    """Get test vertical secrets (per-vertical keys)."""
    return {
        "maintenance_vertical": "test_secret_maintenance_001",
        "inspection_vertical": "test_secret_inspection_002",
        "asset_vertical": "test_secret_asset_003"
    }

