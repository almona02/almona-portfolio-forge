#!/usr/bin/env python3
"""
Test script to verify Redis connection is working in Railway.
Run this after adding Redis service to Railway.
"""
import asyncio
import os
from core.database_adapter import db_adapter

async def test_redis_connection():
    """Test Redis connection."""
    print("🔍 Testing Redis Connection...")

    # Check if REDIS_URL is configured
    redis_url = os.getenv('REDIS_URL', '')
    if not redis_url:
        print("❌ REDIS_URL not configured")
        return False

    print(f"📡 REDIS_URL configured: {redis_url[:30]}...")

    # Test connection
    try:
        redis_healthy = await db_adapter.check_redis_connection()
        if redis_healthy:
            print("✅ Redis connection successful!")

            # Test basic operations
            redis_client = await db_adapter.get_redis()
            if redis_client:
                # Test set/get
                await redis_client.set("test_key", "test_value")
                value = await redis_client.get("test_key")
                if value == "test_value":
                    print("✅ Redis read/write operations working")
                    await redis_client.delete("test_key")
                else:
                    print("⚠️ Redis read/write test failed")

            return True
        else:
            print("❌ Redis connection failed")
            return False

    except Exception as e:
        print(f"❌ Redis test failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_redis_connection())
    exit(0 if result else 1)
