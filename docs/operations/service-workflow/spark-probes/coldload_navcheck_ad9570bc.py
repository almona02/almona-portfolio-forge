"""Genuine cold-load -> login -> Service Routines check for ad9570bc.

Isolated Lane A stack only (API 54421, app 127.0.0.1:3000). Each case uses a
fresh browser context (no storage) and deep-links the target BEFORE login, so
the login-return path is exercised for real. Prints URLs + PASS/FAIL only;
never prints passwords, tokens, or keys.

Fixture passwords are LOCAL-ONLY synthetics from the bootstrap run. Pass via
environment (see .artifacts/lane-a-local/FIXTURES_ACCESS.txt, gitignored);
this file carries no credentials.
"""
import os
import sys
from urllib.parse import urlparse

from playwright.sync_api import sync_playwright

APP = os.environ.get("LANE_A_APP_URL", "http://127.0.0.1:3000")
ADMIN_EMAIL = "lanea.admin.author@local.test"
SUPPORT_EMAIL = "lanea.support.reviewer@local.test"
TECH_EMAIL = "lanea.tech.denied@local.test"


def required_env(name):
    value = os.environ.get(name)
    if not value:
        sys.exit(f"missing required env {name} (local synthetic fixture password)")
    return value


ADMIN_PW = required_env("LANE_A_FIXTURE_PASS_ADMIN")
SUPPORT_PW = required_env("LANE_A_FIXTURE_PASS_SUPPORT")
TECH_PW = required_env("LANE_A_FIXTURE_PASS_TECH")

results = []


def check(name, cond, detail=""):
    results.append((name, bool(cond), detail))
    print(f"[{'PASS' if cond else 'FAIL'}] {name} {detail}", flush=True)


def sign_in_here(pg, email, pw):
    """Fill + submit the login form on the CURRENT page (no navigation)."""
    pg.wait_for_selector('input[type="email"]', timeout=30000)
    pg.fill('input[type="email"]', email)
    pg.fill('input[type="password"]', pw)
    pg.click('button:has-text("Sign in")')
    pg.wait_for_function("!window.location.pathname.includes('login')", timeout=45000)


def path_of(url):
    u = urlparse(url)
    return u.path + (("?" + u.query) if u.query else "") + (("#" + u.fragment) if u.fragment else "")


def main():
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)

        # 1. Admin cold-load deep link, query preserved through login.
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(f"{APP}/admin?tab=service-routines", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_function("window.location.pathname.includes('login')", timeout=30000)
        check("admin deep link bounces to /login pre-auth", "/login" in pg.url, pg.url)
        sign_in_here(pg, ADMIN_EMAIL, ADMIN_PW)
        check("admin lands on /admin?tab=service-routines",
              path_of(pg.url) == "/admin?tab=service-routines", path_of(pg.url))
        try:
            pg.wait_for_selector('button:has-text("New draft")', timeout=30000)
            check("admin Service Routines panel visible", True)
        except Exception as e:
            check("admin Service Routines panel visible", False, repr(e)[:120])
        ctx.close()

        # 2. Admin cold-load with hash; query + hash preserved.
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(f"{APP}/admin?tab=service-routines#drafts", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_function("window.location.pathname.includes('login')", timeout=30000)
        sign_in_here(pg, ADMIN_EMAIL, ADMIN_PW)
        u = urlparse(pg.url)
        check("admin query preserved with hash link", u.path == "/admin" and u.query == "tab=service-routines",
              path_of(pg.url))
        check("admin hash preserved with hash link", u.fragment == "drafts", path_of(pg.url))
        ctx.close()

        # 3. Support cold-load of /support/routines.
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(f"{APP}/support/routines", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_function("window.location.pathname.includes('login')", timeout=30000)
        sign_in_here(pg, SUPPORT_EMAIL, SUPPORT_PW)
        check("support lands on /support/routines", path_of(pg.url) == "/support/routines", path_of(pg.url))
        try:
            pg.wait_for_selector('h1:has-text("Service routine review")', timeout=30000)
            check("support review page visible", True)
        except Exception as e:
            check("support review page visible", False, repr(e)[:120])
        ctx.close()

        # 4. Role boundary: support deep-linking /admin must bounce home, not admin.
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(f"{APP}/admin?tab=service-routines", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_function("window.location.pathname.includes('login')", timeout=30000)
        sign_in_here(pg, SUPPORT_EMAIL, SUPPORT_PW)
        up = urlparse(pg.url)
        check("support login from /admin deep link bounces to /",
              up.path == "/" and "/admin" not in pg.url, path_of(pg.url))
        ctx.close()

        # 5. Denied role: technician cannot reach /support/routines.
        ctx = browser.new_context()
        pg = ctx.new_page()
        pg.goto(f"{APP}/support/routines", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_function("window.location.pathname.includes('login')", timeout=30000)
        sign_in_here(pg, TECH_EMAIL, TECH_PW)
        up = urlparse(pg.url)
        review_visible = pg.locator('h1:has-text("Service routine review")').count() > 0
        check("technician bounced away from /support/routines",
              up.path != "/support/routines" and not review_visible, path_of(pg.url))
        ctx.close()

        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"RESULT cold-load-navcheck: {len(results) - len(failed)}/{len(results)} passed", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
