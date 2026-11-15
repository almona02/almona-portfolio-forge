#!/usr/bin/env python3
"""Spark independent B6 disposable runner (never touches staging/prod).

Spins throwaway PG17 on port 55450, applies the frozen chain incl. B6,
runs the Spark Q6 battery + barrier-synchronized ack/close races, then
Cursor's B6 battery and B5/B4/B3/B1-B2 regressions. Cluster removed afterward.
"""
from __future__ import annotations

import faulthandler
import getpass
import hashlib
import json
import shutil
import subprocess
import sys
import threading
from pathlib import Path

B6 = "ec00b692af10629ed5ee506bbb35762ea5ea00a8"
B5ACC = "2a4042ad44d9234739f514720c3d413ea0ca42e8"
B1_SHA = "7a8307395b79df677a96f77cd993a77351b5805c"
B2_SHA = "8f2acc4e806e70e12e87a24dcbebaef78e63e085"
ROOT = Path(__file__).resolve().parents[2]
EV = Path(r"C:\Users\bobbi\AppData\Local\Temp\b6spark")
OUT_DIR = EV / "chain_b6"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = EV / "_spark_b6_cluster"
PORT = "55450"
USER = getpass.getuser()
BATT = ROOT / "scripts/service-workflow/spark_b6_battery.sql"
REPAIR = ROOT / "scripts/service-workflow/spark_b3_repair.sql"

CHAIN = [
    ("base", "scripts/service-workflow/disposable_b1_base.sql"),
    ("boundary", "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"),
    ("b1", "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"),
    ("b2", "supabase/migrations/20261111220000_service_workflow_b2_assignment.sql"),
    ("sec", "supabase/migrations/20261112150000_service_workflow_security_remediation.sql"),
    ("rls170", "supabase/migrations/20261112170000_service_tickets_staff_select_via_caller_role.sql"),
    ("rls171a", "supabase/migrations/20261112171000_profiles_select_own_for_role_routing.sql"),
    ("rls171b", "supabase/migrations/20261112171100_profiles_select_staff_directory_for_assignment.sql"),
    ("b3", "supabase/migrations/20261112180000_service_workflow_b3_visit_execution.sql"),
    ("b3corr", "supabase/migrations/20261112190000_service_workflow_b3_visit_corrections.sql"),
    ("b3safety", "supabase/migrations/20261112194500_service_workflow_b3_safety_path_final.sql"),
    ("b3ack", "supabase/migrations/20261112200000_service_workflow_b3_f_b3_02_ack_binding.sql"),
    ("b3lock", "supabase/migrations/20261112201500_service_workflow_b3_f_b3_03_lock_order.sql"),
    ("b4", "supabase/migrations/20261112210000_service_workflow_b4_report_submission.sql"),
    ("b4fix", "supabase/migrations/20261113013000_service_workflow_b4_attachment_insert_definer.sql"),
    ("b5", "supabase/migrations/20261115120000_service_workflow_b5_manager_review.sql"),
    ("b5fix", "supabase/migrations/20261115140000_service_workflow_b5_f_b5_01_02_correction.sql"),
    ("b5sel", "supabase/migrations/20261115150000_service_workflow_b5_staging_b5_01_review_select.sql"),
    ("b6", "supabase/migrations/20261115160000_service_workflow_b6_acknowledgment_closure.sql"),
    ("b6fix", "supabase/migrations/20261115170000_service_workflow_b6_f_b6_03_05_correction.sql"),
    ("b6int", "supabase/migrations/20261115171000_service_workflow_b6_integrity_targeting.sql"),
]
TKT_PATH = "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"

CUST1 = "11111111-1111-1111-1111-111111111111"
T1 = "33333333-3333-3333-3333-333333333333"
SUP = "55555555-5555-5555-5555-555555555555"
ADM = "66666666-6666-6666-6666-666666666666"
DB = "spark_b6_main"


def sh(cmd, **kw):
    return subprocess.run(cmd, text=True, capture_output=True, check=False, **kw)


def psql_file(db, path):
    return sh([str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
               "-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)])


def psql(db, sql):
    return sh([str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
               "-d", db, "-v", "ON_ERROR_STOP=1", "-tA", "-c", sql])


def git_show(sha, path, dest):
    r = subprocess.run(["git", "show", f"{sha}:{path}"], capture_output=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise SystemExit(f"cannot extract {path} at {sha}: {r.stderr.decode()}")
    dest.write_bytes(r.stdout)
    return hashlib.sha256(r.stdout).hexdigest()


def apply(db, path, label):
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-2000:]}")


def server_ready():
    try:
        r = subprocess.run([str(PGBIN / "pg_isready"), "-h", "127.0.0.1", "-p", PORT],
                           capture_output=True, timeout=10)
        return r.returncode == 0
    except Exception:
        return False


def fresh_db(db):
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed: {r.stderr}")


def eval_rows(db, table):
    r = psql(db, f"SELECT check_id, status, detail FROM public.{table} ORDER BY 1;")
    rows = [ln for ln in r.stdout.splitlines() if ln.strip()]
    passes = [ln for ln in rows if ln.split("|")[1:2] == ["PASS"]]
    fails = [ln for ln in rows if ln.split("|")[1:2] == ["FAIL"]]
    return rows, passes, fails


def main():
    faulthandler.dump_traceback_later(600, exit=True)
    print("spark-b6 start", flush=True)
    EV.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = {"freeze": B6, "b5_accepted": B5ACC, "files": {}}
    for label, rel in CHAIN:
        dest = OUT_DIR / f"{label}.sql"
        h = git_show(B6, rel, dest)
        entry = {"sha": B6, "path": rel, "sha256": h}
        if label != "b6":
            tmp = OUT_DIR / f"_{label}_b5acc.sql"
            h_old = git_show(B5ACC, rel, tmp)
            entry["unrewritten_vs_b5acc"] = (h_old == h)
            print(f"{label}: b6tree==b5acc -> {h_old == h}")
        manifest["files"][label] = entry
    for label, pinned in (("b1", B1_SHA), ("b2", B2_SHA)):
        tmp = OUT_DIR / f"_{label}_pin.sql"
        h_pin = git_show(pinned, CHAIN[[c[0] for c in CHAIN].index(label)][1], tmp)
        same = (h_pin == manifest["files"][label]["sha256"])
        manifest["files"][label]["pin_match"] = same
        print(f"{label}: pinned -> {same}")
    tkt_raw = OUT_DIR / "_tkt_full.sql"
    git_show(B6, TKT_PATH, tkt_raw)
    lines = tkt_raw.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    tkt = OUT_DIR / "_tkt_section2.sql"
    tkt.write_text("".join(lines[start:]), encoding="utf-8")

    import time
    started_here = False
    if not server_ready():
        if DATADIR.exists():
            shutil.rmtree(DATADIR)
        r = sh([str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8"])
        if r.returncode != 0:
            raise SystemExit(f"initdb failed: {r.stderr}")
        logf = open(EV / "spark_b6_cluster.log", "ab")
        DETACHED = 0x00000008
        proc = subprocess.Popen(
            [str(PGBIN / "postgres"), "-D", str(DATADIR),
             "-p", PORT, "-c", "listen_addresses=127.0.0.1"],
            stdout=logf, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL,
            creationflags=DETACHED, close_fds=True)
        print(f"postgres pid={proc.pid}", flush=True)
        t0 = time.time()
        while not server_ready():
            if time.time() - t0 > 90:
                raise SystemExit("postgres did not become ready in 90s")
            time.sleep(1)
        started_here = True
    else:
        print("reusing live server", flush=True)
    faulthandler.cancel_dump_traceback_later()
    try:
        return run_all(manifest, tkt)
    finally:
        if started_here:
            try:
                p = subprocess.Popen(
                    [str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop",
                     "-m", "fast", "-t", "20"],
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    stdin=subprocess.DEVNULL)
                p.wait(timeout=40)
            except Exception:
                pass
            shutil.rmtree(DATADIR, ignore_errors=True)


def apply_chain(db, tkt):
    apply(db, OUT_DIR / "base.sql", "base")
    apply(db, OUT_DIR / "boundary.sql", "boundary")
    apply(db, tkt, "ticket-number")
    for label in ("b1", "b2", "sec", "rls170", "rls171a", "rls171b",
                  "b3", "b3corr", "b3safety", "b3ack", "b3lock",
                  "b4", "b4fix", "b5", "b5fix", "b5sel", "b6"):
        apply(db, OUT_DIR / f"{label}.sql", label)


def note(db, cid, ok, detail):
    psql(db, f"SELECT spk6_note('{cid}', {'true' if ok else 'false'}, "
              f"'{detail[:480].replace(chr(39), chr(39)*2)}')")


def run_all(manifest, tkt):
    out = dict(manifest)
    out["no_harness_repair"] = True
    fresh_db(DB)
    try:
        apply_chain(DB, tkt)
    except SystemExit as e:
        out["clean_apply"] = f"STILL FAILS: {str(e)[-500:]}"
        print(out["clean_apply"])
        raise
    out["clean_apply"] = "PASS: untouched B6 migration applies on clean chain"
    print(out["clean_apply"])
    # API wrapper check: no p_actor_id in B6 wrappers (freeze file)
    api = OUT_DIR / "_ticketGovernanceApi.ts"
    git_show(B6, "src/lib/ticketGovernanceApi.ts", api)
    text = api.read_text(encoding="utf-8")
    b6region = text[text.find("recordServiceAcknowledgment"):]
    out["wrapper_no_actor"] = ("p_actor_id" not in b6region)
    print(f"wrapper p_actor_id absent in B6 region: {out['wrapper_no_actor']}")
    r = psql_file(DB, BATT)
    if r.returncode != 0:
        raise SystemExit(f"spark B6 battery failed to execute:\n{r.stderr[-2000:]}")
    srows, spass, sfail = eval_rows(DB, "spk6_eval")
    out["spark_b6"] = {"pass": len(spass), "fail": len(sfail), "rows": srows}
    print(f"SPARK B6: pass={len(spass)} fail={len(sfail)}")
    for ln in sfail:
        print("  FAIL:", ln)
    out["concurrency"] = run_concurrency()
    for k, v in out["concurrency"].items():
        print(f"CONC {k}: ok={v.get('ok')} {v.get('detail', '')}")
    srows2, spass2, sfail2 = eval_rows(DB, "spk6_eval")
    out["spark_b6_incl_conc"] = {"pass": len(spass2), "fail": len(sfail2), "rows": srows2}
    # Cursor's own B6 battery, executed independently
    cb = OUT_DIR / "_cursor_b6_battery.sql"
    git_show(B6, "scripts/service-workflow/disposable_b6_battery.sql", cb)
    r = psql_file(DB, cb)
    if r.returncode != 0:
        out["cursor_b6_exec"] = f"EXECUTION FAILED: {r.stderr[-1000:]}"
        print(out["cursor_b6_exec"])
    else:
        crows, cpass, cfail = eval_rows(DB, "b6_eval")
        out["cursor_b6"] = {"pass": len(cpass), "fail": len(cfail), "rows": crows}
        print(f"CURSOR B6: pass={len(cpass)} fail={len(cfail)}")
        for ln in crows:
            print("  ", ln)
    # Spark B5 regression under B6
    b5batt = ROOT / "scripts/service-workflow/spark_b5_battery.sql"
    r = psql_file(DB, b5batt)
    if r.returncode != 0:
        raise SystemExit(f"spark B5 battery failed:\n{r.stderr[-2000:]}")
    b5rows, b5pass, b5fail = eval_rows(DB, "spk5_eval")
    out["b5_regression"] = {"pass": len(b5pass), "fail": len(b5fail), "rows": b5rows}
    print(f"B5 regression: pass={len(b5pass)} fail={len(b5fail)}")
    for ln in b5fail:
        print("  FAIL:", ln)
    # Spark B4 regression under B6
    b4batt = ROOT / "scripts/service-workflow/spark_b4_battery.sql"
    r = psql_file(DB, b4batt)
    if r.returncode != 0:
        raise SystemExit(f"spark B4 battery failed:\n{r.stderr[-2000:]}")
    b4rows, b4pass, b4fail = eval_rows(DB, "spk4_eval")
    # B4 Q4-07c / Q4-23 / Q4-30 are known pre-B5 expectation drifts
    # (storage-stub RLS + B4-scope checks superseded by B5); B6 must add none.
    b4_known = {"Q4-07c", "Q4-23", "Q4-30"}
    b4_unexpected = [ln for ln in b4fail if ln.split("|")[0] not in b4_known]
    out["b4_regression"] = {"pass": len(b4pass), "fail": len(b4fail), "rows": b4rows,
                            "known": sorted(b4_known), "unexpected": b4_unexpected}
    print(f"B4 regression: pass={len(b4pass)} fail={len(b4fail)} unexpected={len(b4_unexpected)}")
    for ln in b4fail:
        print("  FAIL:", ln)
    # Full B3 regression
    b3batt = ROOT / "scripts/service-workflow/spark_b3_battery.sql"
    r = psql_file(DB, b3batt)
    if r.returncode != 0:
        raise SystemExit(f"spark B3 battery failed:\n{r.stderr[-2000:]}")
    b3rows, b3pass, b3fail = eval_rows(DB, "spk_eval")
    out["b3_regression"] = {"pass": len(b3pass), "fail": len(b3fail), "rows": b3rows}
    print(f"B3 regression: pass={len(b3pass)} fail={len(b3fail)}")
    for ln in b3fail:
        print("  FAIL:", ln)
    # B1/B2 regression (freeze-tree battery + repair)
    b1raw = OUT_DIR / "_b1_battery_raw.sql"
    git_show(B6, "scripts/service-workflow/disposable_b1_battery.sql", b1raw)
    persist = b1raw.read_text(encoding="utf-8").replace(
        "CREATE TEMP TABLE b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);",
        "CREATE TABLE IF NOT EXISTS public.b1_eval(check_id text PRIMARY KEY, status text NOT NULL, detail text);\nTRUNCATE public.b1_eval;",
    )
    tmp = OUT_DIR / "_b1_battery_run.sql"
    tmp.write_text(persist, encoding="utf-8")
    r = psql_file(DB, tmp)
    if r.returncode != 0:
        raise SystemExit(f"B1/B2 battery failed:\n{r.stderr[-2000:]}\n{r.stdout[-2000:]}")
    brows0, bpass0, bfail0 = eval_rows(DB, "b1_eval")
    bskip0 = [ln for ln in brows0 if ln.split("|")[1:2] == ["SKIP"]]
    print(f"B1/B2 pre-repair: pass={len(bpass0)} fail={len(bfail0)} skip={len(bskip0)}")
    r = psql_file(DB, REPAIR)
    if r.returncode != 0:
        raise SystemExit(f"repair failed:\n{r.stderr[-2000:]}")
    brows, bpass, bfail = eval_rows(DB, "b1_eval")
    bskip = [ln for ln in brows if ln.split("|")[1:2] == ["SKIP"]]
    bdefer = [ln for ln in brows if ln.split("|")[1:2] == ["DEFER"]]
    out["b1b2_regression"] = {"pass": len(bpass), "fail": len(bfail),
                              "skip": len(bskip), "defer": len(bdefer),
                              "total": len(brows), "fail_rows": bfail}
    print(f"B1/B2 regression: pass={len(bpass)} fail={len(bfail)} "
          f"skip={len(bskip)} defer={len(bdefer)} total={len(brows)}")
    for ln in bfail:
        print("  FAIL:", ln)
    out["ok"] = (len(sfail2) == 0 and len(bfail) == 0 and len(b3fail) == 0
                 and len(b4_unexpected) == 0 and len(b5fail) == 0)
    (EV / "spark_b6_results.json").write_text(json.dumps(out, indent=2), encoding="utf-8")
    print("wrote", EV / "spark_b6_results.json")
    return 0 if out["ok"] else 1


def conn():
    import psycopg2
    c = psycopg2.connect(host="127.0.0.1", port=int(PORT), user=USER, dbname=DB)
    c.autocommit = False
    return c


def mk_issued_fixture(tag):
    """Govern an issued revision. Returns (ticket, job, visit, rev)."""
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT set_config('app.b1_uid', %s, false)", (SUP,))
    cur.execute(
        """INSERT INTO public.service_tickets
           (ticket_number,user_id,title,description,type,priority,status,assigned_to,assigned_by,assigned_at)
           VALUES (%s,%s,'spk6c','spk6c','general','medium','assigned',%s,%s,now()) RETURNING id""",
        (f"SPK6C-{tag}", CUST1, T1, SUP))
    t = str(cur.fetchone()[0])
    cur.execute("SELECT (public.create_service_job(%s,%s,true,'spk6c')).id", (t, f"SPK6C {tag}"))
    j = str(cur.fetchone()[0])
    cur.execute("SELECT public.assign_service_job(%s,%s,'spk6c',NULL)", (j, T1))
    cur.execute(
        "SELECT (public.schedule_service_job_visit(%s, now()+interval '1 hour', now()+interval '3 hours','spk6c',NULL)).id",
        (j,))
    v = str(cur.fetchone()[0])
    cur.execute("SELECT public.b3_minimum_safety_attestation()")
    att = cur.fetchone()[0]
    cur.execute("SELECT set_config('app.b1_uid', %s, false)", (T1,))
    cur.execute("SELECT public.record_visit_safety_check(%s,'passed','spk6c',NULL,%s)", (v, att))
    cur.execute("SELECT public.start_service_job_visit(%s,NULL,%s,'spk6c')", (v, att))
    cur.execute("SELECT public.complete_service_job_visit(%s)", (v,))
    path = f"{t}/b4/c-{tag}.jpg"
    cur.execute("INSERT INTO storage.buckets (id,name,public) VALUES "
                "('ticket-attachments','ticket-attachments',false) ON CONFLICT (id) DO NOTHING")
    cur.execute("INSERT INTO storage.objects (bucket_id,name) VALUES ('ticket-attachments',%s)", (path,))
    import uuid as _uuid
    cur.execute(
        """SELECT (public.submit_service_report_revision(
          %s::uuid,'f conc','w conc','[]'::jsonb,true,'verified_fixed',NULL,
          'decl conc',ARRAY[%s]::text[],NULL,%s::uuid,NULL)).id""",
        (v, path, str(_uuid.uuid4())))
    rev = str(cur.fetchone()[0])
    cur.execute("SELECT set_config('app.b1_uid', %s, false)", (SUP,))
    cur.execute("SELECT public.review_service_report_revision(%s::uuid,'approved_issued',NULL,NULL)", (rev,))
    c.commit()
    cur.close()
    c.close()
    return t, j, v, rev


ACK_SQL = "SELECT (public.record_service_acknowledgment(%s::uuid,%s,%s,NULL)).id"
UNAV_SQL = "SELECT (public.record_service_acknowledgment_unavailable(%s::uuid,%s::jsonb,%s,NULL)).id"
CLOSE_SQL = "SELECT (public.govern_ticket_transition(%s::uuid,'closed','spk6c','fixed and verified',NULL)).id"
RESOLVE_SQL = "SELECT (public.govern_ticket_transition(%s::uuid,'resolved','spk6c','fixed and verified',NULL)).id"
JOB_SQL = "SELECT (public.create_service_job(%s::uuid,%s,%s,'spk6c')).id"


def attempts_json():
    import datetime
    base = datetime.datetime.now(datetime.timezone.utc)
    rows = []
    for i, (ch, oc) in enumerate([("issue_notification", "delivered"), ("phone", "no_answer"), ("email", "no_reply")]):
        ts = (base - datetime.timedelta(days=3 - i)).isoformat()
        rows.append({"attempted_at": ts, "channel": ch, "outcome": oc, "by_actor_id": SUP})
    return json.dumps(rows)


def worker(bar, sql, args, uid, slot, i):
    c = conn()
    try:
        cur = c.cursor()
        cur.execute("SET ROLE b1_auth")
        cur.execute("SELECT set_config('app.b1_uid', %s, false)", (uid,))
        cur.execute("SET LOCAL statement_timeout = '30s'")
        bar.wait(timeout=60)
        try:
            cur.execute(sql, args)
            rid = str(cur.fetchone()[0])
            c.commit()
            slot[i] = ("ok", rid, None)
        except Exception as e:  # noqa: BLE001
            c.rollback()
            slot[i] = ("err", None, f"{type(e).__name__}:{getattr(e, 'pgcode', '?')}:{str(e)[:160]}")
    finally:
        c.close()


def run_pair(sql_a, args_a, uid_a, sql_b, args_b, uid_b):
    bar = threading.Barrier(2)
    slot = [None, None]
    ta = threading.Thread(target=worker, args=(bar, sql_a, args_a, uid_a, slot, 0))
    tb = threading.Thread(target=worker, args=(bar, sql_b, args_b, uid_b, slot, 1))
    ta.start()
    tb.start()
    ta.join(timeout=120)
    tb.join(timeout=120)
    return slot


def run_concurrency():
    res = {}
    # R6-C1: identical accept x accept -> exactly one ack row, both succeed (idempotent)
    t, j, v, rev = mk_issued_fixture("c1")
    slot = run_pair(ACK_SQL, (rev, "accepted", "same"), CUST1,
                    ACK_SQL, (rev, "accepted", "same"), CUST1)
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT count(*), count(DISTINCT id) FROM public.service_acknowledgments WHERE issued_revision_id = %s", (rev,))
    n, nd = cur.fetchone()
    cur.execute("SELECT count(*) FROM public.service_workflow_audit WHERE entity_type='acknowledgment'"
                " AND details->>'issued_revision_id' = %s", (rev,))
    naud = cur.fetchone()[0]
    c.close()
    ok = slot[0][0] == "ok" and slot[1][0] == "ok" and n == 1 and naud == 1
    res["R6-C1"] = {"ok": ok, "detail": f"a={slot[0]} b={slot[1]} rows={n} aud={naud}"}
    note(DB, "R6-C1", ok, res["R6-C1"]["detail"])
    # R6-C2: accept x refuse -> two appended rows, two audits, one effective
    t, j, v, rev = mk_issued_fixture("c2")
    slot = run_pair(ACK_SQL, (rev, "accepted", "yes"), CUST1,
                    ACK_SQL, (rev, "refused", "no"), CUST1)
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT count(*) FROM public.service_acknowledgments WHERE issued_revision_id = %s", (rev,))
    n = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM public.service_workflow_audit WHERE entity_type='acknowledgment'"
                " AND details->>'issued_revision_id' = %s", (rev,))
    naud = cur.fetchone()[0]
    cur.execute("SELECT response FROM public.effective_acknowledgment(%s)", (rev,))
    eff = cur.fetchone()[0]
    c.close()
    ok = slot[0][0] == "ok" and slot[1][0] == "ok" and n == 2 and naud == 2 and eff in ("accepted", "refused")
    res["R6-C2"] = {"ok": ok, "detail": f"a={slot[0]} b={slot[1]} rows={n} aud={naud} eff={eff}"}
    note(DB, "R6-C2", ok, res["R6-C2"]["detail"])
    # R6-C3: unavailable x resolve race -> unav always wins; resolve coherent with ordering
    t, j, v, rev = mk_issued_fixture("c3")
    slot = run_pair(UNAV_SQL, (rev, attempts_json(), "race away"), SUP,
                    RESOLVE_SQL, (t,), SUP)
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT status::text FROM public.service_tickets WHERE id = %s", (t,))
    st = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM public.service_acknowledgments WHERE issued_revision_id = %s", (rev,))
    n = cur.fetchone()[0]
    c.close()
    unav_ok = slot[0][0] == "ok"
    res_ok = slot[1][0] == "ok"
    coherent = ((res_ok and st == "resolved") or ((not res_ok) and st == "in_progress")) and n == 1
    ok = unav_ok and coherent and ("40P01" not in (slot[0][2] or "") and "40P01" not in (slot[1][2] or ""))
    res["R6-C3"] = {"ok": ok, "detail": f"unav={slot[0]} resolve={slot[1]} st={st} rows={n}"}
    note(DB, "R6-C3", ok, res["R6-C3"]["detail"])
    # R6-C4: required-job-create x close race -> exactly one wins, coherent
    t, j, v, rev = mk_issued_fixture("c4")
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT set_config('app.b1_uid', %s, false)", (CUST1,))
    cur.execute(ACK_SQL, (rev, "accepted", "fine"))
    cur.execute("SELECT set_config('app.b1_uid', %s, false)", (SUP,))
    cur.execute(RESOLVE_SQL, (t,))
    c.commit()
    c.close()
    slot = run_pair(JOB_SQL, (t, "late required", True), SUP,
                    CLOSE_SQL, (t,), SUP)
    c = conn()
    cur = c.cursor()
    cur.execute("SELECT status::text FROM public.service_tickets WHERE id = %s", (t,))
    st = cur.fetchone()[0]
    cur.execute("SELECT count(*) FROM public.service_jobs WHERE ticket_id = %s", (t,))
    nj = cur.fetchone()[0]
    c.close()
    job_ok = slot[0][0] == "ok"
    close_ok = slot[1][0] == "ok"
    coherent = (job_ok != close_ok) and ((job_ok and st == "in_progress" and nj == 2)
                                        or (close_ok and st == "closed" and nj == 1))
    ok = coherent and ("40P01" not in (slot[0][2] or "") and "40P01" not in (slot[1][2] or ""))
    res["R6-C4"] = {"ok": ok, "detail": f"job={slot[0]} close={slot[1]} st={st} nj={nj}"}
    note(DB, "R6-C4", ok, res["R6-C4"]["detail"])
    return res


if __name__ == "__main__":
    sys.exit(main())
