#!/usr/bin/env python3
"""
Production Smoke Test for Pilot Launch

Run this after deployment to validate that critical backend services are healthy.
"""

import os
import sys
import time
from typing import List, Tuple

import requests


class SmokeTester:
    def __init__(self, base_url: str, timeout: int = 10):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self.results: List[dict] = []

    def test_endpoint(self, path: str, name: str = None) -> None:
        name = name or path
        url = f"{self.base_url}{path}"

        try:
            start_time = time.time()
            response = requests.get(url, timeout=self.timeout)
            response_time = (time.time() - start_time) * 1000.0

            status = "✅ HEALTHY"

            if response.status_code != 200:
                status = f"❌ HTTP {response.status_code}"
            else:
                # Best-effort structured health interpretation
                try:
                    data = response.json()
                    if path.endswith("/health"):
                        # v2 /health returns {"status": "healthy", ...}
                        status_field = data.get("status")
                        if status_field not in ("healthy", "success"):
                            status = f"❌ UNHEALTHY - status={status_field!r}"
                    elif "connection-pool" in path:
                        # Expect a "status": "success" wrapper
                        if data.get("status") != "success":
                            status = "❌ UNHEALTHY - pool status error"
                    # For Celery and others we just trust HTTP 200 for now
                except Exception:
                    # Non-JSON or unexpected payload; HTTP 200 is still a good sign
                    pass

            self.results.append(
                {
                    "name": name,
                    "status": status,
                    "response_time_ms": round(response_time, 2),
                    "url": url,
                }
            )

        except requests.exceptions.Timeout:
            self.results.append(
                {
                    "name": name,
                    "status": "❌ TIMEOUT",
                    "response_time_ms": float(self.timeout * 1000),
                    "url": url,
                }
            )
        except Exception as e:
            self.results.append(
                {
                    "name": name,
                    "status": f"❌ ERROR - {e}",
                    "response_time_ms": 0.0,
                    "url": url,
                }
            )

    def run_all_tests(self) -> bool:
        print(f"🚀 Running smoke tests against: {self.base_url}")
        print("=" * 60)

        # Critical endpoints for pilot – safe to call even if some are not yet implemented;
        # failures will clearly show which capability is missing.
        endpoints: List[Tuple[str, str]] = [
            ("/api/v2/health", "Core API Health"),
            ("/api/v2/connection-pool/health", "Database Connection Pool"),
            ("/api/v2/celery/status", "Celery Workers"),
            ("/api/v2/quotes/health", "Quotes Service"),
            ("/api/v2/tickets/health", "Tickets Service"),
        ]

        for path, name in endpoints:
            self.test_endpoint(path, name)
            time.sleep(0.5)  # Gentle pacing to avoid bursts

        self.print_results()
        return self.all_healthy()

    def print_results(self) -> None:
        print("\n📊 Smoke Test Results:")
        print("-" * 60)
        for result in self.results:
            print(
                f"{result['status']:<30} "
                f"{result['name']:<25} "
                f"{result['response_time_ms']:>7.2f}ms"
            )

    def all_healthy(self) -> bool:
        # Consider only statuses starting with the green check as healthy
        return all(str(result["status"]).startswith("✅") for result in self.results)


def _parse_args_base_url() -> str:
    """
    Lightweight CLI parsing to support `--url` while remaining simple.
    Falls back to BACKEND_URL env or http://localhost:8000.
    """
    default = os.getenv("BACKEND_URL", "http://localhost:8000")
    args = sys.argv[1:]

    if "--url" in args:
        try:
            idx = args.index("--url")
            return args[idx + 1]
        except (IndexError, ValueError):
            print("⚠️  --url provided without a value, falling back to BACKEND_URL/default")

    return default


if __name__ == "__main__":
    backend_url = _parse_args_base_url()
    tester = SmokeTester(backend_url, timeout=15)
    success = tester.run_all_tests()

    if success:
        print("\n🎉 All smoke tests passed! Pilot system is healthy.")
        sys.exit(0)
    else:
        print("\n💥 Some smoke tests failed! Investigate before pilot launch.")
        sys.exit(1)


