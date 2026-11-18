#!/usr/bin/env python3
"""Checklist journey against the isolated Lane C browser stack.

Login is not success. The attending technician must open the visit checklist
and record the safety-gate Pass. The owning customer's session must then
receive no attempt-history rows.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
ART = ROOT / ".artifacts" / "lane-c-checklist-browser"
ENV_FILE = ART / "environment.json"
FIX_FILE = ART / "FIXTURES_ACCESS.txt"
APP = os.environ.get("LANE_C_APP_URL", "http://127.0.0.1:3012")


def load_env() -> dict:
    if not ENV_FILE.exists() or not FIX_FILE.exists():
        raise SystemExit("Run bootstrap_lane_c_checklist_browser.sh first")
    env = json.loads(ENV_FILE.read_text(encoding="utf-8"))
    passwords: dict[str, str] = {}
    for line in FIX_FILE.read_text(encoding="utf-8").splitlines():
        if "@local.test|" not in line:
            continue
        email, password, _uid = line.split("|", 2)
        passwords[email] = password
    env["passwords"] = passwords
    return env


def api_login(api: str, anon: str, email: str, password: str) -> str:
    req = urllib.request.Request(
        f"{api}/auth/v1/token?grant_type=password",
        data=json.dumps({"email": email, "password": password}).encode(),
        headers={"apikey": anon, "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        body = json.loads(resp.read().decode())
    token = body.get("access_token")
    if not token:
        raise SystemExit(f"login failed for {email}")
    return token


def anon_key_from_dotenv() -> str:
    text = (ROOT / ".env.lane-c.local").read_text(encoding="utf-8")
    for line in text.splitlines():
        if line.startswith("VITE_SUPABASE_ANON_KEY="):
            return line.split("=", 1)[1].strip()
    raise SystemExit("anon key missing from .env.lane-c.local")


def rest(api: str, anon: str, token: str, method: str, path: str, payload: dict | None = None):
    data = None if payload is None else json.dumps(payload).encode()
    req = urllib.request.Request(
        f"{api}{path}",
        data=data,
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method=method,
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode() or "null"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() or ""
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"message": raw}
        return exc.code, parsed


def history(api: str, anon: str, token: str, visit_id: str):
    return rest(
        api,
        anon,
        token,
        "GET",
        f"/rest/v1/service_visit_checklist_answer_history?visit_id=eq.{visit_id}&select=item_key,attempt,outcome,actor_role,note",
    )


def main() -> int:
    env = load_env()
    api = env["api_url"]
    anon = anon_key_from_dotenv()
    visit_id = env["visit_id"]
    passwords = env["passwords"]
    tech_email = "lanec.tech.attending@local.test"
    owner_email = "lanec.customer.owner@local.test"
    other_email = "lanec.customer.other@local.test"
    other_tech = "lanec.tech.other@local.test"
    support_email = "lanec.support@local.test"

    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        raise SystemExit(
            "Playwright is required for the checklist journey "
            "(pip install playwright && playwright install chromium)"
        )

    results: dict = {
        "correction_sha": env["correction_sha"],
        "app_url": APP,
        "visit_id": visit_id,
        "steps": [],
    }

    def step(name: str, ok: bool, detail: str) -> None:
        results["steps"].append({"name": name, "ok": ok, "detail": detail})
        print(f"{'PASS' if ok else 'FAIL'} {name}: {detail}")
        if not ok:
            raise SystemExit(1)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        hosts: list[str] = []

        def watch(request) -> None:
            from urllib.parse import urlparse
            host = urlparse(request.url).netloc
            if host in ("127.0.0.1:3012", "localhost:3012"):
                return
            if "/auth/v1/" in request.url or "/rest/v1/" in request.url:
                hosts.append(host)

        page.on("request", watch)
        page.goto(f"{APP}/login", wait_until="domcontentloaded")
        page.locator("#email").wait_for(timeout=30000)
        page.locator("#email").fill(tech_email)
        page.locator("#password").fill(passwords[tech_email])
        page.get_by_role("button", name="Sign in").click()
        panel = page.get_by_test_id(f"service-visit-checklist-{visit_id}")
        panel.wait_for(timeout=30000)
        local_hosts = {h for h in hosts if h}
        step(
            "browser-uses-loopback-api",
            bool(local_hosts) and local_hosts <= {"127.0.0.1:54431"},
            f"hosts={sorted(local_hosts)}",
        )
        step("tech-opens-checklist", True, "checklist panel visible after technician login")
        loto = panel.locator("div").filter(has_text="LOTO").first
        loto.get_by_role("button", name="Pass").click()
        page.get_by_text("Checklist item saved").wait_for(timeout=15000)
        panel.get_by_text("revision 1").wait_for(timeout=15000)
        step("tech-records-safety-pass", True, "LOTO Pass saved; revision 1")
        context.close()

        owner_ctx = browser.new_context()
        owner_page = owner_ctx.new_page()
        owner_page.goto(f"{APP}/login", wait_until="domcontentloaded")
        owner_page.locator("#email").wait_for(timeout=30000)
        owner_page.locator("#email").fill(owner_email)
        owner_page.locator("#password").fill(passwords[owner_email])
        owner_page.get_by_role("button", name="Sign in").click()
        owner_page.wait_for_timeout(1500)
        owner_page.goto(f"{APP}/technician", wait_until="domcontentloaded")
        owner_page.wait_for_timeout(1500)
        visible = owner_page.get_by_test_id(f"service-visit-checklist-{visit_id}").count()
        step("owner-no-checklist-panel", visible == 0, f"panel count={visible}")
        owner_ctx.close()
        browser.close()

    tech_token = api_login(api, anon, tech_email, passwords[tech_email])
    status, rows = history(api, anon, tech_token, visit_id)
    ok_rows = (
        status == 200
        and isinstance(rows, list)
        and any(
            r.get("item_key") == "sg1" and r.get("outcome") == "passed" and r.get("actor_role") == "technician"
            for r in rows
        )
    )
    step("tech-history-select", ok_rows, f"status={status} n={len(rows) if isinstance(rows, list) else 'err'}")

    support_token = api_login(api, anon, support_email, passwords[support_email])
    status, rows = history(api, anon, support_token, visit_id)
    ok_staff = status == 200 and isinstance(rows, list) and any(r.get("item_key") == "sg1" for r in rows)
    step("support-history-select", ok_staff, f"status={status} n={len(rows) if isinstance(rows, list) else 'err'}")

    owner_token = api_login(api, anon, owner_email, passwords[owner_email])
    status, rows = history(api, anon, owner_token, visit_id)
    step(
        "owner-history-select-empty",
        status == 200 and rows == [],
        f"status={status} body_len={len(rows) if isinstance(rows, list) else 'err'}",
    )
    status, body = rest(
        api,
        anon,
        owner_token,
        "POST",
        "/rest/v1/rpc/get_visit_checklist_workspace",
        {"p_visit_id": visit_id, "p_actor_id": None},
    )
    detail = json.dumps(body) if not isinstance(body, str) else body
    step(
        "owner-rpc-denied",
        status >= 400 and "routine_checklist_authz_denied" in detail,
        f"status={status}",
    )

    for email, label in ((other_email, "unrelated-customer"), (other_tech, "unrelated-tech")):
        token = api_login(api, anon, email, passwords[email])
        status, rows = history(api, anon, token, visit_id)
        step(
            f"{label}-history-empty",
            status == 200 and rows == [],
            f"status={status} n={len(rows) if isinstance(rows, list) else 'err'}",
        )

    results["ok"] = all(s["ok"] for s in results["steps"])
    (ART / "journey_results.json").write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps({"ok": results["ok"], "steps": len(results["steps"])}))
    return 0 if results["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
