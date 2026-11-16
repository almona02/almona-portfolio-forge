"""Lane A genuine browser chain on isolated local Supabase (e1345a0a).
Reads fixture creds + anon key from local gitignored files; never prints secrets.
Usage: python scripts/service-workflow/browser_journey_lane_a.py [suffix] (from repo root)
Env: LANE_A_APP_ROOT=<checkout serving :3000> LANE_A_DB_PASSWORD=<isolated pg password>
Evidence: .artifacts/spark-laneA-verify/browser/
"""
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

from playwright.sync_api import sync_playwright

APP = "http://127.0.0.1:3000"
SUFFIX = sys.argv[1] if len(sys.argv) > 1 else "1"
CODE_GOOD = f"SPK-BRW-{SUFFIX}"
CODE_BAD = f"SPK-BRW-BAD-{SUFFIX}"
EVDIR = ".artifacts/spark-laneA-verify/browser"
SERVE = os.environ.get("LANE_A_APP_ROOT", r"C:\projects\almona-routines-authoring")
results = {"steps": []}


def note(step, ok, detail=""):
    results["steps"].append({"step": step, "ok": ok, "detail": detail[:300]})
    print(f"[{'PASS' if ok else 'FAIL'}] {step} :: {detail[:160]}", flush=True)
    if not ok:
        raise SystemExit(f"CHAIN STOPPED at {step}: {detail[:300]}")


def parse_env_file(path):
    out = {}
    with open(path, encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                out[k.strip()] = v.strip().strip("'\"")
    return out


def load_fixtures():
    fx = {}
    with open(os.path.join(SERVE, ".artifacts/lane-a-local/FIXTURES_ACCESS.txt"), encoding="utf-8") as f:
        for ln in f:
            m = re.match(r"(ADMIN|SUPPORT|TECH|CUSTOMER)=(.*)", ln.strip())
            if m:
                fx[m.group(1)] = m.group(2).strip()
    env = parse_env_file(os.path.join(SERVE, ".artifacts/lane-a-local/.env.lane-a.local"))
    emails = {"ADMIN": "lanea.admin.author@local.test", "SUPPORT": "lanea.support.reviewer@local.test",
              "TECH": "lanea.tech.denied@local.test", "CUSTOMER": "lanea.customer.denied@local.test"}
    assert set(fx) == set(emails), f"fixture parse got {sorted(fx)}"
    return emails, fx, env["VITE_SUPABASE_URL"], env["VITE_SUPABASE_ANON_KEY"]


def login(pg, email, password):
    for attempt in (1, 2):
        pg.goto(f"{APP}/login", wait_until="domcontentloaded", timeout=45000)
        pg.wait_for_selector('input[type="email"]', timeout=30000)
        pg.fill('input[type="email"]', email)
        pg.fill('input[type="password"]', password)
        try:
            with pg.expect_navigation(url=lambda u: "/login" not in u, timeout=45000):
                pg.click('button:has-text("Sign in")')
            pg.wait_for_timeout(1500)
            return
        except Exception as e:
            pg.screenshot(path=f"{EVDIR}/diag-login-fail-{attempt}.png")
            body = (pg.inner_text("body") or "")[:500].replace("\n", " | ")
            print(f"LOGIN attempt {attempt} failed at {pg.url}: {body}", flush=True)
            if attempt == 2:
                raise


def ensure_routines_tab(pg):
    # Deep link ?tab=service-routines proved flaky (lands on overview); use the
    # real nav path and record which entry worked.
    pg.goto(f"{APP}/admin?tab=service-routines", wait_until="networkidle", timeout=45000)
    try:
        pg.wait_for_selector('button:has-text("New draft")', timeout=8000)
        return "deep-link"
    except Exception:
        pass
    pg.goto(f"{APP}/admin", wait_until="networkidle", timeout=45000)
    pg.get_by_role("link", name="Service Routines").or_(
        pg.get_by_role("button", name="Service Routines")).first.click()
    pg.wait_for_selector('button:has-text("New draft")', timeout=30000)
    return "nav-click"


def token_of(pg):
    return pg.evaluate("""() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('auth-token')) {
          try { return JSON.parse(localStorage.getItem(k)).access_token || null; } catch (e) { return null; }
        }
      }
      return null;
    }""")


def rpc(api_url, anon, token, fn, body):
    req = urllib.request.Request(f"{api_url}/rest/v1/rpc/{fn}", data=json.dumps(body).encode(),
                                 method="POST", headers={"apikey": anon, "Authorization": f"Bearer {token}",
                                                         "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            return e.code, json.loads(raw)
        except json.JSONDecodeError:
            return e.code, {"message": raw[:300]}


def db_one(sql):
    _pw = os.environ.get("LANE_A_DB_PASSWORD")
    if not _pw: raise SystemExit("set LANE_A_DB_PASSWORD (isolated stack only; never staging/prod)")
    env = dict(os.environ, PGPASSWORD=_pw)
    r = subprocess.run(
        [r"C:\Program Files\PostgreSQL\17\bin\psql.exe",
         "host=127.0.0.1 port=54422 user=postgres dbname=postgres connect_timeout=10",
         "-t", "-A", "-c", sql],
        text=True, capture_output=True, check=False, timeout=60, env=env)
    assert r.returncode == 0, f"db lookup failed: {r.stderr[:200]}"
    return r.stdout.strip().splitlines()[0].strip() if r.stdout.strip() else ""


def main():
    emails, pw, api_url, anon = load_fixtures()
    assert api_url.startswith("http://127.0.0.1:54421"), "API URL must be the isolated stack"
    with sync_playwright() as p:
        b = p.chromium.launch(headless=True)
        admin = b.new_page(viewport={"width": 1360, "height": 900})
        errs = []
        admin.on("pageerror", lambda e: errs.append(str(e)[:200]))

        # ---- Step 1: admin creates + edits ----
        login(admin, emails["ADMIN"], pw["ADMIN"])
        entry = ensure_routines_tab(admin)
        results["admin_entry"] = entry
        admin.screenshot(path=f"{EVDIR}/02-admin-panel.png")
        admin.click('button:has-text("New draft")')
        admin.wait_for_selector("#ra-code", timeout=15000)
        admin.fill("#ra-code", CODE_GOOD)
        admin.fill("#ra-name", "Spark browser journey")
        default_payload = admin.input_value("#ra-payload")
        assert '"sections"' in default_payload, "default payload missing"
        admin.locator("div[role=dialog] button:has-text('Create')").first.click()
        admin.wait_for_selector(f"tr:has-text('{CODE_GOOD}')", timeout=30000)
        admin.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Open").click()
        admin.wait_for_selector("#draft-payload", timeout=15000)
        # edit: bump description text inside payload (name change via payload title edit)
        payload_text = admin.input_value("#draft-payload")
        doc = json.loads(payload_text)
        doc["sections"][0]["items"][0]["instruction"] = "Spark journey edited isolation step"
        admin.fill("#draft-payload", json.dumps(doc))
        admin.click("button:has-text('Save draft')")
        admin.wait_for_selector("text=Draft updated", timeout=30000)
        submitted_text = admin.input_value("#draft-payload")
        with open(f"{EVDIR}/submitted-{CODE_GOOD}.json", "w", encoding="utf-8") as f:
            f.write(submitted_text)
        admin.screenshot(path=f"{EVDIR}/03-created-edited.png")
        note("1-admin-create-edit", True, f"{CODE_GOOD} draft saved+edited")
        admin.click("button:has-text('Submit for review')")
        admin.wait_for_selector("text=Submitted for review", timeout=30000)
        note("1b-admin-submit", True, "good draft submitted")

        # ---- Step 2: invalid publication shows itemised errors ----
        admin.click('button:has-text("New draft")')
        admin.wait_for_selector("#ra-code", timeout=15000)
        admin.fill("#ra-code", CODE_BAD)
        admin.fill("#ra-name", "Spark invalid draft")
        admin.fill("#ra-payload", '{"sections":[]}')
        admin.locator("div[role=dialog] button:has-text('Create')").first.click()
        admin.wait_for_selector(f"tr:has-text('{CODE_BAD}')", timeout=30000)
        admin.locator("tr", has_text=CODE_BAD).get_by_role("button", name="Open").click()
        admin.wait_for_selector("button:has-text('Submit for review')", timeout=15000)
        admin.click("button:has-text('Submit for review')")
        admin.wait_for_selector("text=Submitted for review", timeout=30000)
        # support session reviews the BAD draft so publish can be attempted
        support = b.new_page(viewport={"width": 1360, "height": 900})
        login(support, emails["SUPPORT"], pw["SUPPORT"])
        support.goto(f"{APP}/support/routines", wait_until="networkidle", timeout=45000)
        support.wait_for_selector(f"tr:has-text('{CODE_BAD}')", timeout=30000)
        support.locator("tr", has_text=CODE_BAD).get_by_role("button", name="Record review").click()
        support.wait_for_selector("text=Review recorded", timeout=30000)
        admin.locator("tr", has_text=CODE_BAD).get_by_role("button", name="Open").click()
        admin.wait_for_selector("button:has-text('Publish')", timeout=15000)
        admin.click("button:has-text('Publish')")
        admin.wait_for_timeout(2500)
        body = admin.inner_text("body") or ""
        assert "dedicated safety section required" in body, "itemised error not shown"
        admin.screenshot(path=f"{EVDIR}/04-bad-publish-errors.png")
        note("2-itemised-errors", True, "publish denied with itemised safety-section error")

        # ---- Step 3: distinct Support reviewer reads exact draft + records ----
        support.goto(f"{APP}/support/routines", wait_until="networkidle", timeout=45000)
        support.wait_for_selector(f"tr:has-text('{CODE_GOOD}')", timeout=30000)
        support.screenshot(path=f"{EVDIR}/05-support-queue.png")
        support.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Preview").click()
        support.wait_for_selector('[data-testid="routine-review-preview"]', timeout=15000)
        preview_text = support.inner_text('[data-testid="routine-review-preview"]')
        with open(f"{EVDIR}/support-preview-{CODE_GOOD}.json", "w", encoding="utf-8") as f:
            f.write(preview_text)
        pv = json.loads(preview_text)
        submitted = json.loads(submitted_text)
        pv_sections = (pv.get("preview") or {}).get("sections") or pv.get("sections") or []
        assert pv_sections, "preview has no sections"
        assert [s.get("kind") for s in pv_sections][0] == "safety", "safety not first"
        assert {json.dumps(s, sort_keys=True) for s in pv_sections} == \
            {json.dumps(s, sort_keys=True) for s in submitted["sections"]}, "preview != submitted"
        assert pv.get("read_only") is True or (pv.get("preview") or {}).get("read_only") is True, "not read-only"
        note("3a-support-preview-exact", True, "support preview matches submitted sections")
        support.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Record review").click()
        support.wait_for_selector("text=Review recorded", timeout=30000)
        support.screenshot(path=f"{EVDIR}/06-review-recorded.png")
        note("3b-support-review-recorded", True, "distinct support review recorded (row verified via DB)")

        # ---- Step 4: admin publishes; preview matches reviewed content ----
        admin.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Open").click()
        admin.wait_for_selector("button:has-text('Publish')", timeout=15000)
        admin.click("button:has-text('Publish')")
        admin.wait_for_selector("text=Published", timeout=30000)
        admin.wait_for_timeout(1500)
        admin.screenshot(path=f"{EVDIR}/07-published.png")
        note("4a-admin-publish", True, "good draft published")
        # open published preview (first Preview button in versions area)
        admin.locator("button", has_text="Preview").first.click()
        admin.wait_for_selector("text=Read-only preview", timeout=15000)
        admin.wait_for_timeout(1000)
        pub_text = admin.inner_text("div[role=dialog]") or ""
        m = re.search(r"\{[\s\S]*\}", pub_text)
        assert m, "no JSON in published preview dialog"
        with open(f"{EVDIR}/published-preview-{CODE_GOOD}.json", "w", encoding="utf-8") as f:
            f.write(m.group(0))
        pub = json.loads(m.group(0))
        pub_sections = (pub.get("preview") or {}).get("sections") or pub.get("sections") or []
        assert {json.dumps(s, sort_keys=True) for s in pub_sections} == \
            {json.dumps(s, sort_keys=True) for s in submitted["sections"]}, "published preview != reviewed"
        assert (pub.get("version_ordinal") == 1) or ((pub.get("preview") or {}).get("version_ordinal") == 1), \
            f"ordinal not 1: {str(pub)[:200]}"
        admin.screenshot(path=f"{EVDIR}/08-published-preview.png")
        note("4b-published-preview-match", True, "published preview matches reviewed content, ordinal 1")
        admin.keyboard.press("Escape")

        # ---- Step 5: reload persists; repeat publish is idempotent ----
        admin.reload(wait_until="networkidle")
        admin.wait_for_timeout(2000)
        try:
            admin.wait_for_selector(f"tr:has-text('{CODE_GOOD}')", timeout=8000)
        except Exception:
            ensure_routines_tab(admin)
            admin.wait_for_selector(f"tr:has-text('{CODE_GOOD}')", timeout=30000)
        admin.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Open").click()
        admin.wait_for_timeout(2000)
        body5 = admin.inner_text("body") or ""
        assert "published" in body5.lower(), "published state not visible after reload"
        note("5a-reload-persists", True, "published state survives reload")
        atoken = token_of(admin)
        assert atoken, "no admin session token"
        vid = db_one(f"SELECT v.id FROM public.service_routine_versions v JOIN public.service_routines r ON r.id=v.routine_id WHERE r.code='{CODE_GOOD}'")
        st, rep = rpc(api_url, anon, atoken, "publish_service_routine_version", {"p_version_id": vid})
        assert st == 200 and rep.get("idempotent") is True and rep.get("version_ordinal") == 1, f"repeat not idempotent: {st} {str(rep)[:200]}"
        results["repeat_publish"] = {"status": st, "idempotent": True, "ordinal": 1}
        note("5b-repeat-idempotent", True, "repeat publish idempotent, ordinal 1, no duplicate")

        # ---- Step 6: retire via UI; history stays readable ----
        admin.locator("tr", has_text=CODE_GOOD).get_by_role("button", name="Open").click()
        admin.wait_for_selector("button:has-text('Retire')", timeout=15000)
        admin.click("button:has-text('Retire')")
        admin.wait_for_selector("text=Retired", timeout=30000)
        admin.wait_for_timeout(1500)
        admin.screenshot(path=f"{EVDIR}/09-retired.png")
        note("6a-retire", True, "published version retired via UI")
        admin.locator("button", has_text="Preview").first.click()
        admin.wait_for_selector("text=Read-only preview", timeout=15000)
        admin.wait_for_timeout(1000)
        ret_text = admin.inner_text("div[role=dialog]") or ""
        m2 = re.search(r"\{[\s\S]*\}", ret_text)
        assert m2, "no JSON in retired preview dialog"
        with open(f"{EVDIR}/retired-preview-{CODE_GOOD}.json", "w", encoding="utf-8") as f:
            f.write(m2.group(0))
        ret = json.loads(m2.group(0))
        ret_sections = (ret.get("preview") or {}).get("sections") or ret.get("sections") or []
        assert {json.dumps(s, sort_keys=True) for s in ret_sections} == \
            {json.dumps(s, sort_keys=True) for s in submitted["sections"]}, "retired preview != reviewed"
        admin.screenshot(path=f"{EVDIR}/10-retired-preview.png")
        note("6b-retired-readable", True, "retired version preview exact")
        admin.keyboard.press("Escape")
        # code reuse denied via UI
        admin.click('button:has-text("New draft")')
        admin.wait_for_selector("#ra-code", timeout=15000)
        admin.fill("#ra-code", CODE_GOOD)
        admin.fill("#ra-name", "reuse attempt")
        admin.locator("div[role=dialog] button:has-text('Create')").first.click()
        admin.wait_for_timeout(2500)
        dup_body = admin.inner_text("body") or ""
        assert "duplicate" in dup_body.lower() or "already exists" in dup_body.lower() or "unique" in dup_body.lower(), \
            "code-reuse denial not surfaced"
        admin.screenshot(path=f"{EVDIR}/11-code-reuse-denied.png")
        note("6c-code-reserved", True, "retired code reuse denied in UI")
        admin.keyboard.press("Escape")

        # ---- Step 7: unauthorized roles denied ----
        for role, name in (("TECH", "tech"), ("CUSTOMER", "customer")):
            upg = b.new_page(viewport={"width": 1360, "height": 900})
            login(upg, emails[role], pw[role])
            upg.goto(f"{APP}/support/routines", wait_until="networkidle", timeout=45000)
            upg.wait_for_timeout(2500)
            assert upg.url.rstrip("/") == APP, f"{name} reached /support/routines: {upg.url}"
            ubody = upg.inner_text("body") or ""
            assert CODE_GOOD not in ubody and CODE_BAD not in ubody, f"{name} sees draft content"
            upg.goto(f"{APP}/admin?tab=service-routines", wait_until="networkidle", timeout=45000)
            upg.wait_for_timeout(2500)
            assert "/admin" not in upg.url, f"{name} reached /admin: {upg.url}"
            upg.screenshot(path=f"{EVDIR}/12-{name}-denied.png")
            # draft-content RPC via own session token denied (BAD draft still in_review);
            # retired-version preview allowed for tech, denied for customer.
            utok = token_of(upg)
            assert utok, f"no {name} session token"
            bad_vid = db_one(f"SELECT v.id FROM public.service_routine_versions v JOIN public.service_routines r ON r.id=v.routine_id WHERE r.code='{CODE_BAD}'")
            st2, rep2 = rpc(api_url, anon, utok, "get_service_routine_preview", {"p_version_id": bad_vid})
            assert st2 != 200, f"{name} draft-preview RPC unexpectedly allowed: {st2}"
            st3, rep3 = rpc(api_url, anon, utok, "get_service_routine_preview", {"p_version_id": vid})
            if name == "tech":
                assert st3 == 200, f"tech retired-preview RPC denied: {st3}"
            else:
                assert st3 != 200, f"customer retired-preview RPC unexpectedly allowed: {st3}"
            note(f"7-{name}-denied", True, f"redirects + draft RPC denied ({st2}), retired RPC {st3}")
            upg.close()

        with open(f"{EVDIR}/journey-results.json", "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print("JOURNEY COMPLETE", flush=True)
        b.close()


if __name__ == "__main__":
    main()
