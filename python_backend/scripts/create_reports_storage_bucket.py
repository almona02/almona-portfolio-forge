#!/usr/bin/env python3
"""
Create Supabase Storage bucket for reports.

This script creates the 'reports' storage bucket in Supabase Storage
with private access (signed URLs only).

Usage:
    python scripts/create_reports_storage_bucket.py

Requirements:
    - SUPABASE_URL environment variable
    - SUPABASE_SERVICE_ROLE_KEY environment variable
"""

import os
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from supabase import create_client, Client  # type: ignore


def create_reports_bucket() -> bool:
    """
    Create the 'reports' storage bucket in Supabase Storage.
    
    Returns:
        True if bucket was created successfully, False otherwise
    """
    # Get credentials from environment (try multiple variable names)
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_service_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY") or 
        os.getenv("SUPABASE_SERVICE_KEY")
    )
    
    if not supabase_url:
        print("ERROR: SUPABASE_URL environment variable not set")
        return False
    
    if not supabase_service_key:
        print("ERROR: SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY not set")
        return False
    
    try:
        # Create service role client
        client: Client = create_client(supabase_url, supabase_service_key)
        
        # Check if bucket already exists
        print("Checking if 'reports' bucket exists...")
        try:
            buckets = client.storage.list_buckets()
            existing_bucket = next(
                (b for b in buckets if b.name == "reports"), None
            )
            
            if existing_bucket:
                print("[OK] Bucket 'reports' already exists")
                print(f"   Bucket ID: {existing_bucket.id}")
                print(f"   Public: {existing_bucket.public}")
                return True
        except Exception as e:
            print(f"Warning: Could not list buckets: {e}")
        
        # Create bucket (private - signed URLs only)
        print("Creating 'reports' bucket...")
        try:
            # Access storage client directly
            storage_client = client.storage
            # Create bucket with options
            response = storage_client.create_bucket(
                id="reports",
                name="reports",
                options={
                    "public": False,  # Private bucket - signed URLs only
                },
            )
            print("[OK] Bucket 'reports' created successfully")
            print(f"   Response: {response}")
            return True
            
        except Exception as e:
            # Check if bucket was created (might fail if already exists)
            error_str = str(e).lower()
            if "already exists" in error_str or "duplicate" in error_str:
                print("[OK] Bucket 'reports' already exists (created externally)")
                return True
            else:
                print(f"ERROR: Failed to create bucket: {e}")
                print("\nNote: You may need to create the bucket manually via Supabase Dashboard:")
                print("   1. Go to Storage section in Supabase Dashboard")
                print("   2. Click 'New bucket'")
                print("   3. Name: 'reports'")
                print("   4. Public: No (private bucket)")
                print("   5. File size limit: None")
                print("   6. Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv")
                return False
                
    except Exception as e:
        print(f"ERROR: Failed to connect to Supabase: {e}")
        return False


def main():
    """Main function."""
    print("=" * 60)
    print("Supabase Storage Bucket Creation Script")
    print("Bucket: reports")
    print("=" * 60)
    print()
    
    success = create_reports_bucket()
    
    print()
    if success:
        print("=" * 60)
        print("[OK] Setup Complete")
        print("=" * 60)
        print()
        print("Bucket Configuration:")
        print("  - Name: reports")
        print("  - Access: Private (signed URLs only)")
        print("  - Expiration: 7 days (configurable)")
        print("  - Supported formats: PDF, Excel (.xlsx), CSV")
        sys.exit(0)
    else:
        print("=" * 60)
        print("[ERROR] Setup Failed")
        print("=" * 60)
        sys.exit(1)


if __name__ == "__main__":
    main()
