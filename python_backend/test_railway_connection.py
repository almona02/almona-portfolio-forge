"""
Test Railway connection and verify services are wired correctly.
Tests both internal Railway URLs and proxy connections.
"""

import asyncio
import os
import sys
from typing import Dict, Any

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Imports after path modification (needed for local modules)
from core.database_adapter import db_adapter  # noqa: E402
from core.config import settings  # noqa: E402
from core.railway_health import railway_health  # noqa: E402


async def test_railway_connection() -> Dict[str, Any]:
    """Test Railway connection and all services."""

    print("=" * 60)
    print("Railway Connection Verification")
    print("=" * 60)
    print()

    results = {
        "environment_variables": {},
        "database_connection": {},
        "redis_connection": {},
        "health_check": {},
        "overall_status": "unknown",
    }

    # 1. Check Environment Variables
    print("1. Checking Environment Variables...")
    print("-" * 60)

    env_vars = {
        "DATABASE_URL": settings.DATABASE_URL,
        "REDIS_URL": settings.REDIS_URL,
        "REDIS_HOST": settings.REDIS_HOST,
        "REDIS_PORT": settings.REDIS_PORT,
        "ENVIRONMENT": settings.ENVIRONMENT,
    }

    for key, value in env_vars.items():
        if value:
            # Mask sensitive data
            if "URL" in key or "HOST" in key:
                masked = value[:30] + "..." if len(value) > 30 else value
            else:
                masked = value
            print(f"  [OK] {key}: {masked}")
            results["environment_variables"][key] = "configured"
        else:
            print(f"  [FAIL] {key}: NOT SET")
            results["environment_variables"][key] = "not_set"

    print()

    # 2. Test Database Connection
    print("2. Testing Database Connection...")
    print("-" * 60)

    try:
        db_status = await db_adapter.get_connection_status()

        railway_db = db_status.get("railway_postgresql", False)
        supabase_db = db_status.get("supabase", False)
        primary_db = db_status.get("primary_database", "unknown")

        if railway_db:
            print("  [OK] Railway PostgreSQL: CONNECTED")
            print(f"     Primary Database: {primary_db}")
            results["database_connection"]["railway"] = "connected"
        elif supabase_db:
            msg = (
                "  [WARN] Railway PostgreSQL: NOT CONNECTED "
                "(using Supabase fallback)"
            )
            print(msg)
            print(f"     Primary Database: {primary_db}")
            results["database_connection"]["railway"] = "not_connected"
            results["database_connection"]["supabase"] = "connected"
        else:
            print("  [FAIL] Database: NOT CONNECTED")
            results["database_connection"]["status"] = "failed"

        results["database_connection"]["details"] = db_status

    except Exception as e:
        print(f"  [FAIL] Database Connection Test Failed: {e}")
        results["database_connection"]["error"] = str(e)

    print()

    # 3. Test Redis Connection
    print("3. Testing Redis Connection...")
    print("-" * 60)

    try:
        redis_connected = await db_adapter.check_redis_connection()

        if redis_connected:
            print("  [OK] Redis: CONNECTED")
            print(f"     Host: {settings.REDIS_HOST}:{settings.REDIS_PORT}")
            results["redis_connection"]["status"] = "connected"
        else:
            print("  [WARN] Redis: NOT CONNECTED (optional service)")
            results["redis_connection"]["status"] = "not_connected"

    except Exception as e:
        print(f"  [WARN] Redis Connection Test Failed: {e}")
        results["redis_connection"]["error"] = str(e)
        results["redis_connection"]["status"] = "error"

    print()

    # 4. Full Health Check
    print("4. Running Full Health Check...")
    print("-" * 60)

    try:
        health_status = await railway_health.check_all_services()

        overall = health_status.get("overall_status", "unknown")
        services = health_status.get("services", {})

        print(f"  Overall Status: {overall.upper()}")
        print()

        for service_name, service_status in services.items():
            status = service_status.get("status", "unknown")
            if status == "healthy":
                print(f"  [OK] {service_name.capitalize()}: {status}")
            elif status == "degraded":
                print(f"  [WARN] {service_name.capitalize()}: {status}")
            else:
                print(f"  [FAIL] {service_name.capitalize()}: {status}")

        results["health_check"] = health_status
        results["overall_status"] = overall

    except Exception as e:
        print(f"  [FAIL] Health Check Failed: {e}")
        results["health_check"]["error"] = str(e)

    print()

    # 5. Summary
    print("=" * 60)
    print("Summary")
    print("=" * 60)

    if results["overall_status"] == "healthy":
        msg = "[SUCCESS] Railway is properly wired and " "all services are operational!"
        print(msg)
    elif results["overall_status"] == "degraded":
        print("[WARN] Railway is connected but some services are degraded")
    else:
        print("[FAIL] Railway connection has issues - check details above")

    print()

    # Check for Railway-specific connection details
    if settings.DATABASE_URL:
        db_url_lower = settings.DATABASE_URL.lower()
        if "railway" in db_url_lower or "rlwy.net" in settings.DATABASE_URL:
            print("[OK] DATABASE_URL appears to be a Railway connection")
        elif "supabase" in db_url_lower:
            print("[WARN] DATABASE_URL is using Supabase (not Railway)")

    if settings.REDIS_URL:
        redis_url_lower = settings.REDIS_URL.lower()
        if "railway" in redis_url_lower or "rlwy.net" in settings.REDIS_URL:
            print("[OK] REDIS_URL appears to be a Railway connection")
        elif "redis" in redis_url_lower:
            print("[INFO] REDIS_URL is configured (may be local/external)")

    return results


async def main():
    """Main test function."""
    try:
        results = await test_railway_connection()

        # Exit with appropriate code
        if results["overall_status"] == "healthy":
            sys.exit(0)
        elif results["overall_status"] == "degraded":
            sys.exit(1)
        else:
            sys.exit(2)

    except Exception as e:
        print(f"\n[FAIL] Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(3)


if __name__ == "__main__":
    asyncio.run(main())
