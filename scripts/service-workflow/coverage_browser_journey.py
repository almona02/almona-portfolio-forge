#!/usr/bin/env python3
"""Browser smoke for coverage UI against the isolated Auth/PostgREST stack.

Environment-only. Distinct from the F-COV-CAP-1 product correction.
Not staging / production / FR-1.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / ".artifacts/coverage-browser"
ENV_JSON = ART / "environment.json"
ACCESS = ART / "FIXTURES_ACCESS.txt"
OUT = ART / "browser_journey_results.json"


def main() -> int:
    if not ENV_JSON.exists() or not ACCESS.exists():
        print("Run bootstrap_coverage_browser.sh first", file=sys.stderr)
        return 2
    env = json.loads(ENV_JSON.read_text(encoding="utf-8"))
    app = env["app_url"]
    admin_email = "coverage.admin@local.test"
    admin_pass = None
    for line in ACCESS.read_text(encoding="utf-8").splitlines():
        if line.startswith(admin_email + "|"):
            admin_pass = line.split("|")[1]
            break
    if not admin_pass:
        print("admin password missing from FIXTURES_ACCESS.txt", file=sys.stderr)
        return 2

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        payload = {
            "status": "NOT_RUN",
            "reason": "playwright not installed",
            "app_url": app,
            "distinct_from_product_correction": True,
        }
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps(payload))
        return 0

    steps = []
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(f"{app}/login", wait_until="domcontentloaded", timeout=45000)
        steps.append({"id": "COV-BR-01", "check": "login page", "status": "PASS"})
        page.fill('input[type="email"]', admin_email)
        page.fill('input[type="password"]', admin_pass)
        page.get_by_role("button", name="Sign in").click()
        page.wait_for_function("!window.location.pathname.includes('login')", timeout=45000)
        steps.append({"id": "COV-BR-02", "check": "admin sign-in", "status": "PASS"})
        page.goto(f"{app}/admin?tab=service-coverage", wait_until="domcontentloaded", timeout=45000)
        page.get_by_test_id("service-machine-coverage-panel").wait_for(timeout=15000)
        steps.append({"id": "COV-BR-03", "check": "coverage panel visible", "status": "PASS"})
        page.get_by_test_id("coverage-generate").wait_for(timeout=5000)
        steps.append({"id": "COV-BR-04", "check": "generate control present", "status": "PASS"})
        browser.close()

    payload = {
        "status": "PASS" if all(s["status"] == "PASS" for s in steps) else "FAIL",
        "steps": steps,
        "app_url": app,
        "coverage_id": env.get("coverage_id"),
        "distinct_from_product_correction": True,
        "not_staging": True,
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(json.dumps({"status": payload["status"], "steps": len(steps), "out": str(OUT)}))
    return 0 if payload["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
