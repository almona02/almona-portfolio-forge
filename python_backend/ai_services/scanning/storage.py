"""Supabase storage helpers for SmartScan assets."""

from __future__ import annotations

import uuid
from typing import Dict, Optional


def _public_upload(client, bucket: str, path: str, data: bytes, content_type: str) -> str:
    storage = client.storage.from_(bucket)
    storage.upload(path, data, {"content-type": content_type, "upsert": True})
    return storage.get_public_url(path)


def upload_scan_artifacts(
    client,
    bucket: str,
    image_bytes: bytes,
    image_content_type: str,
    svg_text: str,
    prefix: str = "scans",
) -> Dict[str, Optional[str]]:
    """Upload raw scan and SVG to Supabase storage under a common prefix."""
    scan_id = uuid.uuid4().hex
    base_path = f"{prefix}/{scan_id}"

    photo_path = f"{base_path}.png"
    svg_path = f"{base_path}.svg"

    photo_url = _public_upload(client, bucket, photo_path, image_bytes, image_content_type)
    svg_url = _public_upload(client, bucket, svg_path, svg_text.encode("utf-8"), "image/svg+xml")

    return {"photo_url": photo_url, "svg_url": svg_url}

