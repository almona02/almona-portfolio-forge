"""Spark independent Lane B browser journey (isolated stack 54521 + Vite 3005).

Implementation: d0c311c9 | Manifest tip: 8685aa55 | Contract: da4bcb4a.
Real Chromium (headless) against real Auth/PostgREST/full 110-migration chain.
Exact assertions: exact success text + absence of error + persisted state reload.
Writes spark_lane_b_browser_results.json next to this file.
"""
import json
import os
import sys

import psycopg2
from playwright.sync_api import sync_playwright

APP = os.environ.get("LANE_B_APP", "http://127.0.0.1:3005")
TICKET = "be120b6f-a84c-4c83-bbf3-24a9ed2e482d"
JOB = "ac508d68-f626-458a-831d-c3a3a483bdbc"
V1 = "808672d8-d684-4f51-a879-a41c214582c4"
V2 = "9b122d22-79cf-40d4-93c2-69912c2bbbd0"
V3DRAFT = "f95712e2-4e58-4a83-aad1-65756289e9e8"


def _cred(role):
    p = f"LANE_B_{role.upper()}"
    try:
        return os.environ[f"{p}_EMAIL"], os.environ[f"{p}_PASS"]
    except KeyError:
        raise SystemExit(f"set {p}_EMAIL and {p}_PASS (isolated stack only)")


CREDS = {r: _cred(r) for r in ("admin", "support", "technician", "customer")}
try:
    DB = os.environ["LANE_B_DB_URL"]
except KeyError:
    raise SystemExit("set LANE_B_DB_URL (isolated stack only; never staging/prod)")
RESULTS = []


def note(cid, name, ok, detail):
    RESULTS.append({"id": cid, "name": name, "pass": ok, "detail": detail})
    print(f"{'PASS' if ok else 'FAIL'} {cid} {name} :: {detail}")
    if not ok:
        raise AssertionError(f"{cid}: {detail}")


def login(ctx, role):
    pg = ctx.new_page()
    email, pw = CREDS[role]
    pg.goto(f"{APP}/login", wait_until="domcontentloaded", timeout=45000)
    pg.wait_for_selector('input[type="email"]', timeout=30000)
    pg.fill('input[type="email"]', email)
    pg.fill('input[type="password"]', pw)
    with pg.expect_navigation(url=lambda u: "/login" not in u, timeout=45000):
        pg.click('button[type="submit"]')
    return pg


def pin_panel(pg):
    sel = f'[data-testid="service-job-routine-pin-{JOB}"]'
    pg.wait_for_selector(sel, timeout=30000)
    return pg.locator(sel)


def db_one(sql, args=()):
    conn = psycopg2.connect(DB)
    cur = conn.cursor()
    cur.execute(sql, args)
    row = cur.fetchone()
    conn.close()
    return row[0] if row else None


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(channel="chrome", headless=True)

        # ---- Admin pins V1.
        ctx = browser.new_context()
        pg = login(ctx, "admin")
        pg.goto(f"{APP}/support/tickets/{TICKET}", wait_until="networkidle", timeout=45000)
        panel = pin_panel(pg)
        note("B-01", "admin sees empty pin panel",
             panel.get_by_test_id("no-active-pin").count() == 1, "No active routine pin.")
        panel.locator(f"#pin-version-{JOB}").fill(V1)
        panel.locator(f"#pin-reason-{JOB}").fill("browser pin v1")
        panel.get_by_role("button", name="Pin", exact=True).click()
        pg.get_by_text("Routine pinned", exact=True).wait_for(timeout=30000)
        note("B-02", "admin pin success toast",
             panel.get_by_test_id("pin-action-error").count() == 0, "exact toast, no error")
        active = panel.get_by_test_id("active-job-routine-pin")
        txt = active.inner_text()
        assert "LB-BROWSER-1" in txt and "version 1" in txt, txt
        assert V1 in txt and "browser pin v1" in txt, txt
        ref = pg.get_by_test_id("visit-job-pin-readonly")
        assert ref.count() == 1 and "LB-BROWSER-1" in ref.first.inner_text()
        note("B-03", "admin active pin + visit readonly ref", True, txt.replace("\n", " | "))
        pg.reload(wait_until="networkidle")
        panel = pin_panel(pg)
        txt2 = panel.get_by_test_id("active-job-routine-pin").inner_text()
        assert V1 in txt2 and "browser pin v1" in txt2, txt2
        note("B-04", "admin pin persists after reload", True, "V1 active post-reload")
        ctx.close()

        # ---- Support: error path then replace with V2.
        ctx = browser.new_context()
        pg = login(ctx, "support")
        pg.goto(f"{APP}/support/tickets/{TICKET}", wait_until="networkidle", timeout=45000)
        panel = pin_panel(pg)
        panel.locator(f"#pin-version-{JOB}").fill(V3DRAFT)
        panel.locator(f"#pin-reason-{JOB}").fill("attempt draft")
        panel.get_by_role("button", name="Replace", exact=True).click()
        err = panel.get_by_test_id("pin-action-error")
        err.wait_for(timeout=30000)
        assert err.inner_text().strip() == "routine_pin_version_not_published", err.inner_text()
        assert panel.get_by_text("Routine pin replaced", exact=True).count() == 0
        note("B-05", "support draft-replace exact error", True, err.inner_text().strip())
        panel.locator(f"#pin-version-{JOB}").fill(V2)
        panel.locator(f"#pin-reason-{JOB}").fill("browser replace v2")
        panel.get_by_role("button", name="Replace", exact=True).click()
        pg.get_by_text("Routine pin replaced", exact=True).wait_for(timeout=30000)
        assert panel.get_by_test_id("pin-action-error").count() == 0
        txt = panel.get_by_test_id("active-job-routine-pin").inner_text()
        assert "version 2" in txt and V2 in txt and "browser replace v2" in txt, txt
        note("B-06", "support replace success", True, "V2 active, no error")

        # ---- Support schedules the visit; the attending tech must start it (B3 rule).
        sched = pg.get_by_role("button", name="Schedule visit", exact=True)
        sched_section = sched.locator("xpath=ancestor::div[contains(@class,'border-dashed')][1]")
        dt_inputs = sched_section.locator('input[type="datetime-local"]')
        assert dt_inputs.count() == 2
        dt_inputs.nth(0).fill("2026-11-20T10:00")
        dt_inputs.nth(1).fill("2026-11-20T12:00")
        sched.click()
        pg.get_by_role("button", name="Start", exact=True).wait_for(timeout=30000)
        note("B-07", "support schedules visit", True, "scheduled visit listed")
        pg_support, ctx_support = pg, ctx  # kept open: stale-window probe below

        # ---- Technician: read-only pin, then starts the visit -> pin locks.
        ctx = browser.new_context()
        pg = login(ctx, "technician")
        pg.goto(f"{APP}/support/tickets/{TICKET}", wait_until="networkidle", timeout=45000)
        panel = pin_panel(pg)
        txt = panel.get_by_test_id("active-job-routine-pin").inner_text()
        assert V2 in txt, txt
        assert panel.get_by_role("button", name="Pin", exact=True).count() == 0
        assert panel.get_by_role("button", name="Replace", exact=True).count() == 0
        assert panel.get_by_role("button", name="Unpin", exact=True).count() == 0
        assert panel.locator(f"#pin-version-{JOB}").count() == 0
        assert pg.get_by_test_id("visit-job-pin-readonly").count() == 1
        note("B-08", "technician read-only pre-start", True, "V2 visible, no controls")
        pg.locator('input[type="checkbox"]').first.check()
        pg.get_by_role("button", name="Start", exact=True).click()
        pg.get_by_text("Visit started", exact=True).wait_for(timeout=30000)
        note("B-09", "tech visit start", True, "exact 'Visit started' toast")
        ctx.close()

        # ---- Stale support window: server lock is authoritative.
        # Either the cached controls still render (then RPC denies exactly) or the
        # query already refetched (then the locked banner renders). Both exact.
        panel = pin_panel(pg_support)
        replace_btn = panel.get_by_role("button", name="Replace", exact=True)
        if replace_btn.count() > 0:
            panel.locator(f"#pin-version-{JOB}").fill(V1)
            panel.locator(f"#pin-reason-{JOB}").fill("stale attempt")
            replace_btn.click()
            err = panel.get_by_test_id("pin-action-error")
            err.wait_for(timeout=30000)
            assert err.inner_text().strip() == "routine_pin_locked_after_start", err.inner_text()
            note("B-10", "stale-window replace denied exactly", True,
                 "routine_pin_locked_after_start via UI")
        else:
            assert panel.get_by_test_id("pin-locked-banner").count() == 1
            note("B-10", "stale window already refetched lock", True, "locked banner renders")
        pg_support.reload(wait_until="networkidle")
        panel = pin_panel(pg_support)
        locked = panel.get_by_test_id("pin-locked-banner")
        assert locked.count() == 1
        assert locked.inner_text().strip() == "Pin changes locked after first work start."
        txt = panel.get_by_test_id("active-job-routine-pin").inner_text()
        assert V2 in txt, txt
        assert panel.get_by_role("button", name="Replace", exact=True).count() == 0
        note("B-11", "lock + V2 after reload", True, "banner exact, V2 active, no controls")
        ctx_support.close()

        # ---- DB: boundary set, no visit dual-write, audits present.
        b = db_one("SELECT work_started_boundary_at FROM public.service_jobs WHERE id=%s", (JOB,))
        assert b is not None
        nv = db_one(
            "SELECT count(*) FROM public.service_job_visits WHERE job_id=%s "
            "AND pinned_routine_version_id IS NOT NULL", (JOB,))
        assert nv == 0, f"visit dual-write detected: {nv}"
        acts = db_one(
            "SELECT string_agg(action, ',' ORDER BY created_at) FROM public.service_workflow_audit "
            "WHERE entity_type='service_job_routine_pin' AND details->>'job_id'=%s", (JOB,))
        assert acts == "routine_job_pinned,routine_job_pin_replaced", acts
        note("B-12", "boundary + no-dual-write + audits", True, f"boundary set; audits {acts}")

        # ---- Customer: no pin content.
        ctx = browser.new_context()
        pg = login(ctx, "customer")
        pg.goto(f"{APP}/support/tickets/{TICKET}", wait_until="networkidle", timeout=45000)
        body = pg.content()
        # NOTE: the routine code equals the ticket number by fixture coincidence
        # (both 'LB-BROWSER-1'; the page legitimately shows the ticket number),
        # so the code string is not a leak marker here; the routine name,
        # version ids, and pin testids are.
        assert f'service-job-routine-pin-{JOB}' not in body, "pin panel leaked to customer"
        assert "visit-job-pin-readonly" not in body, "visit pin ref leaked to customer"
        assert "Browser Pin Routine" not in body, "routine name leaked to customer"
        assert V1 not in body and V2 not in body, "version ids leaked to customer"
        note("B-13", "customer sees no pin content", True, f"url={pg.url}")
        ctx.close()

        browser.close()


if __name__ == "__main__":
    try:
        main()
    except AssertionError as e:
        print(f"ABORT: {e}")
    except Exception as e:  # noqa: BLE001 - record playwright/harness crashes too
        RESULTS.append({"id": "ABORT", "name": "harness crash", "pass": False,
                        "detail": f"{type(e).__name__}: {str(e)[:300]}"})
        print(f"ABORT-HARNESS: {type(e).__name__}: {str(e)[:300]}")
    n_pass = sum(1 for r in RESULTS if r["pass"])
    with open("spark_lane_b_browser_results.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "implementation": "d0c311c9cfc9a65bf67f85ee95b14946224d0a7b",
                "manifest_tip": "8685aa5510ce4ee804f1463511d619f9f41244b3",
                "contract": "da4bcb4a",
                "app": APP,
                "results": RESULTS,
            },
            f,
            indent=2,
        )
    print(f"BROWSER {n_pass}/{len(RESULTS)}")
    sys.exit(0 if n_pass == len(RESULTS) and len(RESULTS) == 13 else 1)
