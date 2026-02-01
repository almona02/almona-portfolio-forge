#!/usr/bin/env python3
"""
Test and verify the 'reports' Supabase Storage bucket.

This script verifies that the bucket exists and can be used for
report file uploads and signed URL generation.

Usage:
    python scripts/test_reports_storage_bucket.py

Requirements:
    - SUPABASE_URL environment variable
    - SUPABASE_SERVICE_ROLE_KEY environment variable
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timezone

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client  # type: ignore


def test_bucket_exists(client: Client) -> bool:
    """Test if the 'reports' bucket exists."""
    print("=" * 60)
    print("Test 1: Check if bucket exists")
    print("=" * 60)

    try:
        buckets = client.storage.list_buckets()
        reports_bucket = next((b for b in buckets if b.name == "reports"), None)

        if not reports_bucket:
            print("[FAIL] Bucket 'reports' not found")
            print("Available buckets:", [b.name for b in buckets])
            return False

        print("[OK] Bucket 'reports' exists")
        print(f"   Bucket ID: {reports_bucket.id}")
        print(f"   Public: {reports_bucket.public}")
        print(f"   Created: {reports_bucket.created_at}")

        if reports_bucket.public:
            print("[WARNING] Bucket is public (should be private)")
        else:
            print("[OK] Bucket is private (correct)")

        return True

    except Exception as e:
        print(f"[FAIL] Error checking bucket: {e}")
        return False


def test_bucket_upload(client: Client) -> bool:
    """Test uploading a file to the bucket."""
    print()
    print("=" * 60)
    print("Test 2: Upload test file")
    print("=" * 60)

    try:
        storage = client.storage.from_("reports")

        # Create test file content (CSV format for testing)
        test_content = (
            f"test,value\ncreated_at,{datetime.now(timezone.utc).isoformat()}"
        )
        test_path = "test/verification.csv"
        test_bytes = test_content.encode("utf-8")

        print(f"Uploading to: {test_path}")
        storage.upload(test_path, test_bytes, {"content-type": "text/csv"})

        print("[OK] File uploaded successfully")
        return True

    except Exception as e:
        print(f"[FAIL] Error uploading file: {e}")
        return False


def test_signed_url_generation(client: Client) -> bool:
    """Test generating a signed URL."""
    print()
    print("=" * 60)
    print("Test 3: Generate signed URL")
    print("=" * 60)

    try:
        storage = client.storage.from_("reports")
        test_path = "test/verification.csv"

        print(f"Generating signed URL for: {test_path}")
        signed_url_response = storage.create_signed_url(
            test_path, expires_in=3600  # 1 hour
        )

        # Extract signed URL (response format may vary)
        if isinstance(signed_url_response, dict):
            signed_url = (
                signed_url_response.get("signedURL")
                or signed_url_response.get("url")
                or str(signed_url_response)
            )
        else:
            signed_url = str(signed_url_response)

        if not signed_url:
            print("[FAIL] No signed URL returned")
            return False

        print("[OK] Signed URL generated successfully")
        print(f"   URL: {signed_url[:80]}...")
        print(f"   Expires in: 1 hour")

        return True

    except Exception as e:
        print(f"[FAIL] Error generating signed URL: {e}")
        return False


def test_file_listing(client: Client) -> bool:
    """Test listing files in the bucket."""
    print()
    print("=" * 60)
    print("Test 4: List files in bucket")
    print("=" * 60)

    try:
        storage = client.storage.from_("reports")

        # List files in test directory
        files = storage.list("test")

        if files:
            print(f"[OK] Found {len(files)} file(s) in test/ directory")
            for file in files[:5]:  # Show first 5
                print(f"   - {file.get('name', 'unknown')}")
        else:
            print("[OK] No files in test/ directory (empty is OK)")

        return True

    except Exception as e:
        print(f"[FAIL] Error listing files: {e}")
        return False


def cleanup_test_files(client: Client) -> bool:
    """Clean up test files."""
    print()
    print("=" * 60)
    print("Cleanup: Remove test files")
    print("=" * 60)

    try:
        storage = client.storage.from_("reports")
        test_path = "test/verification.csv"

        storage.remove([test_path])
        print("[OK] Test file removed")
        return True

    except Exception as e:
        print(f"[WARNING] Could not remove test file: {e}")
        print("   (This is not critical - you can remove it manually)")
        return True  # Don't fail the test for cleanup errors


def main():
    """Main function."""
    print("=" * 60)
    print("Supabase Storage Bucket Verification Script")
    print("Bucket: reports")
    print("=" * 60)
    print()

    # Get credentials from environment or config
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv(
        "SUPABASE_SERVICE_KEY"
    )

    # Try loading from config if not in environment
    if not supabase_url or not supabase_service_key:
        try:
            from core.config import settings

            if not supabase_url and settings.SUPABASE_URL:
                supabase_url = settings.SUPABASE_URL
            if not supabase_service_key and settings.SUPABASE_SERVICE_KEY:
                supabase_service_key = settings.SUPABASE_SERVICE_KEY
        except Exception:
            pass  # Config not available, use env vars only

    if not supabase_url:
        print("ERROR: SUPABASE_URL not set")
        print("   Set environment variable: SUPABASE_URL")
        print("   Or configure in core/config.py")
        sys.exit(1)

    if not supabase_service_key:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not set")
        print("   Set environment variable: SUPABASE_SERVICE_ROLE_KEY")
        print("   Or configure in core/config.py")
        sys.exit(1)

    try:
        # Create service role client
        client: Client = create_client(supabase_url, supabase_service_key)

        # Run tests
        tests = [
            ("Bucket Exists", test_bucket_exists),
            ("Upload File", test_bucket_upload),
            ("Signed URL Generation", test_signed_url_generation),
            ("File Listing", test_file_listing),
        ]

        results = []
        for test_name, test_func in tests:
            try:
                result = test_func(client)
                results.append((test_name, result))
            except Exception as e:
                print(f"\n[ERROR] Test '{test_name}' failed with exception: {e}")
                results.append((test_name, False))

        # Cleanup
        cleanup_test_files(client)

        # Summary
        print()
        print("=" * 60)
        print("Test Summary")
        print("=" * 60)

        all_passed = True
        for test_name, result in results:
            status = "[PASS]" if result else "[FAIL]"
            print(f"{status} {test_name}")
            if not result:
                all_passed = False

        print()
        if all_passed:
            print("[OK] All tests passed!")
            print()
            print("Bucket is configured correctly and ready for use.")
            sys.exit(0)
        else:
            print("[FAIL] Some tests failed.")
            print("Please review the errors above and fix the configuration.")
            sys.exit(1)

    except Exception as e:
        print(f"\n[ERROR] Failed to connect to Supabase: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
