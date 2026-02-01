"""Supabase Storage service for report file uploads."""

from __future__ import annotations

import logging
from typing import Optional, Tuple

from supabase import Client  # type: ignore

logger = logging.getLogger(__name__)


def upload_report_file(
    client: Client,
    file_bytes: bytes,
    file_path: str,
    content_type: str,
    expires_in: int = 604800,  # 7 days default
) -> Tuple[str, Optional[str]]:
    """
    Upload report file to Supabase Storage and return signed URL.

    Args:
        client: Supabase client (service role)
        file_bytes: File content as bytes
        file_path: Storage path (e.g., "reports/{job_id}.pdf")
        content_type: MIME type (e.g., "application/pdf")
        expires_in: URL expiration in seconds (default: 7 days)

    Returns:
        Tuple of (signed_url, expires_at_iso) or raises exception on error
    """
    try:
        # Get storage bucket
        storage = client.storage.from_("reports")

        # Upload file
        storage.upload(
            file_path,
            file_bytes,
            {"content-type": content_type, "upsert": True},
        )

        # Generate signed URL
        signed_url_response = storage.create_signed_url(
            file_path, expires_in=expires_in
        )

        # Extract signed URL (response format may vary)
        if isinstance(signed_url_response, dict):
            signed_url = signed_url_response.get("signedURL") or signed_url_response.get("url")
        else:
            signed_url = str(signed_url_response)

        if not signed_url:
            raise ValueError("Failed to get signed URL from storage response")

        # Calculate expiration timestamp
        from datetime import datetime, timezone, timedelta
        expires_at = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        expires_at_iso = expires_at.isoformat().replace("+00:00", "Z")

        return signed_url, expires_at_iso

    except Exception as e:
        logger.error(f"Failed to upload report file to storage: {e}")
        raise RuntimeError(f"Storage upload failed: {str(e)}") from e
