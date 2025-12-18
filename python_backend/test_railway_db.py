#!/usr/bin/env python3
"""
Quick test script to check Railway PostgreSQL connection.
Run this in the Railway environment to verify the database connection.
"""
import asyncio
import os
from core.database_adapter import db_adapter

async def test_connection():
    """Test Railway PostgreSQL connection."""
    print("Testing Railway PostgreSQL connection...")

    # Check DATABASE_URL
    db_url = os.getenv('DATABASE_URL', '')
    if not db_url:
        print("❌ DATABASE_URL not set")
        return

    print(f"📡 DATABASE_URL: {db_url[:50]}...")
    print(f"🔧 Using Railway: {db_adapter.use_railway}")

    # Test connection
    try:
        status = await db_adapter.get_connection_status()
        print("📊 Connection Status:")
        for key, value in status.items():
            print(f"  {key}: {value}")

        if status.get('railway_postgresql'):
            print("✅ Railway PostgreSQL connection successful!")
        elif status.get('supabase'):
            print("⚠️  Using Supabase fallback (Railway PostgreSQL not available)")
        else:
            print("❌ No database connection available")

    except Exception as e:
        print(f"❌ Connection test failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
