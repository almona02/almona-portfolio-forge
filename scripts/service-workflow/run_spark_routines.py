#!/usr/bin/env python3
"""Spark independent Lane A battery (RA-A1..A13 + concurrency + audit).
Disposable PostgreSQL only. No staging/production.
Usage: python scripts/service-workflow/run_spark_routines.py
Env: LANEA_SRC=<checkout to verify> (default: enclosing repo root),
     LANEA_EXPECT_SHA=<implementation SHA> (default: 5e53ee00 freeze).
Writes .artifacts/spark-laneA-verify/spark_routines_results.json (gitignored)."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(os.environ.get("LANEA_SRC", str(ROOT)))
HERE = ROOT / ".artifacts" / "spark-laneA-verify"
BASE = SRC / "scripts/service-workflow/disposable_routines_base.sql"
MIG = SRC / "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
PROBES = SRC / "scripts/service-workflow/spark_routines_probes.sql"
RC_PROBES = SRC / "scripts/service-workflow/spark_routines_rolechange.sql"
OUT = HERE / "spark_routines_results.json"
RUNLOG = HERE / "run.log"

import datetime as _dt


def log(msg: str) -> None:
    line = f"[{_dt.datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    with open(RUNLOG, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def run(cmd: list[str], timeout: int, label: str, cwd: Path | None = None,
        capture: bool = True) -> subprocess.CompletedProcess[str]:
    # capture=False for process spawners whose grandchildren would inherit pipes
    # (pg_ctl start: postmaster holds captured handles open -> communicate() never EOFs).
    log(f"run<{label}> pid-spawn: {cmd[0]}")
    try:
        if capture:
            r = subprocess.run(cmd, text=True, capture_output=True, check=False, timeout=timeout,
                               cwd=str(cwd) if cwd else None)
        else:
            r = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               check=False, timeout=timeout, cwd=str(cwd) if cwd else None)
    except subprocess.TimeoutExpired:
        log(f"run<{label}> TIMEOUT after {timeout}s")
        raise
    log(f"run<{label}> exit={r.returncode}")
    return r
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = HERE / "_spk_cluster"
PORT = "55457"
PGUSER = "postgres"
DB = "spark_lane_a"
FREEZE_DEFAULT = "5e53ee009507b29de707be0f1eebd0252c34c9c9"
EXPECT = os.environ.get("LANEA_EXPECT_SHA", FREEZE_DEFAULT)
CONTRACT = "1350b749ffd999ef3206c9733f0bcfb47b483ce2"

ADMIN1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
ADMIN2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2"
SUPPORT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"


def psql_file(db: str, path: Path, role: str | None = None) -> subprocess.CompletedProcess[str]:
    return run(
        [str(PGBIN / "psql"), f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
         "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        300, f"psql-file:{path.name}",
    )


def psql(db: str, sql: str, tuplify: bool = False) -> subprocess.CompletedProcess[str]:
    args = [str(PGBIN / "psql"), f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={db} connect_timeout=5",
            "-v", "ON_ERROR_STOP=1"]
    if tuplify:
        args += ["-t", "-A"]
    args += ["-c", sql]
    return run(args, 120, f"psql-c:{sql[:60]!r}")


def apply(db: str, path: Path, label: str) -> None:
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"{label} failed:\n{r.stderr}\n{r.stdout[-4000:]}")


def wait_ready(retries: int = 60) -> None:
    last_err = ""
    for _ in range(retries):
        try:
            r = psql("postgres", "SELECT 1")
        except OSError as e:  # transient spawn failure: keep waiting
            last_err = repr(e)
            time.sleep(0.5)
            continue
        if r.returncode == 0:
            return
        last_err = (r.stderr or "").strip().splitlines()[-1:] or [""]
        last_err = last_err[0][:200]
        time.sleep(0.5)
    raise SystemExit(f"postgres did not become ready; last psql error: {last_err}")


def stop_cluster() -> None:
    run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "immediate"], 60, "pg_ctl-stop",
        capture=False)


def parse_rows(stdout: str) -> list[dict]:
    rows = []
    for ln in stdout.splitlines():
        parts = [p.strip() for p in ln.split("|")]
        if len(parts) == 3 and parts[0].startswith("SPK-"):
            rows.append({"check_id": parts[0], "status": parts[1], "detail": parts[2]})
    return rows


def scalar(sql: str) -> str:
    r = psql(DB, sql, tuplify=True)
    if r.returncode != 0:
        raise SystemExit(f"scalar failed: {sql}\n{r.stderr}")
    return r.stdout.strip()


def audit_asserts() -> list[dict]:
    out: list[dict] = []

    def note(cid: str, ok: bool, detail: str) -> None:
        out.append({"check_id": cid, "status": "PASS" if ok else "FAIL", "detail": detail})

    n = scalar("""SELECT count(*) FROM public.service_workflow_audit
        WHERE action = 'routine_draft_created' AND actor_role = 'admin'
          AND entity_type = 'service_routine' AND actor_id = '%s'
          AND details->>'code' = 'SPK-D1-OK'""" % ADMIN1)
    note("SPK-A1-created", n == "1", f"draft_created rows={n}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'SPK-D11-IDEM'""")
    n = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_published' AND entity_id = '%s'" % vid)
    note("SPK-A2-idem-audit", n == "1", f"published rows after repeat={n}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'SPK-D2-NOF'""")
    n = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_published' AND entity_id = '%s'" % vid)
    note("SPK-A3-deny-noaudit", n == "0", f"published rows after failed publish={n}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'SPK-D4-STALE'""")
    rec = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_review_recorded' AND entity_id = '%s'" % vid)
    inv = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_review_invalidated' AND entity_id = '%s'" % vid)
    kept = scalar("SELECT count(*) FROM public.service_routine_reviews WHERE version_id = '%s'" % vid)
    elig = scalar("SELECT count(*) FROM public.service_routine_reviews WHERE version_id = '%s' AND eligible_for_publish" % vid)
    note("SPK-A4-review-trail", rec == "2" and inv == "1" and kept == "2" and elig == "1",
         f"recorded={rec} invalidated={inv} rows={kept} eligible={elig}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'SPK-D7-STALE'""")
    n = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_draft_updated' AND entity_id = '%s'" % vid)
    note("SPK-A5-stale-noaudit", n == "1", f"draft_updated rows (fresh only)={n}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'SPK-D10-RET'""")
    n = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_retired' AND entity_id = '%s'" % vid)
    note("SPK-A6-retired", n == "1", f"retired rows={n}")
    rid = scalar("SELECT id FROM public.service_routines WHERE code = 'SPK-D9-APPL'")
    n = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_applicability_set' AND details->>'routine_id' = '%s'" % rid)
    note("SPK-A7-appl-set", int(n) >= 2, f"applicability_set rows={n}")
    n = scalar("""SELECT count(*) FROM public.service_workflow_audit a
        WHERE a.action IN ('routine_draft_created','routine_review_recorded','routine_published','routine_retired')
          AND (a.actor_id IS NULL OR a.actor_role IS NULL OR a.entity_type IS NULL OR a.entity_id IS NULL
               OR NOT (a.details ? 'routine_id'))""")
    note("SPK-A8-attribution", n == "0", f" unattributed success rows={n}")
    return out


def setup_flow(code: str) -> str:
    good = '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}'
    r = psql(DB, "SET ROLE ra_auth; SELECT set_config('app.b1_uid','%s',false); "
                 "SELECT public.create_service_routine_draft('%s','t','','','%s',ARRAY['saw']);" % (ADMIN1, code, good), tuplify=True)
    if r.returncode != 0:
        raise SystemExit(f"setup {code} failed:\n{r.stderr}")
    vid = scalar("""SELECT v.id FROM public.service_routine_versions v
        JOIN public.service_routines ro ON ro.id = v.routine_id WHERE ro.code = '%s'""" % code)
    psql(DB, "SET ROLE ra_auth; SELECT set_config('app.b1_uid','%s',false); SELECT public.submit_service_routine_for_review('%s');" % (ADMIN1, vid))
    psql(DB, "SET ROLE ra_auth; SELECT set_config('app.b1_uid','%s',false); SELECT public.record_service_routine_review('%s','cc');" % (SUPPORT, vid))
    return vid


def race_publish(vids: list[str]) -> list[subprocess.CompletedProcess[str]]:
    results: list = [None] * len(vids)
    barrier = threading.Barrier(len(vids))

    def one(i: int) -> None:
        barrier.wait(timeout=30)
        results[i] = psql(DB, "SET statement_timeout = '60s'; SET ROLE ra_auth; "
                              "SELECT set_config('app.b1_uid','%s',false); "
                              "SELECT public.publish_service_routine_version('%s');" % (ADMIN2, vids[i]), tuplify=True)

    threads = [threading.Thread(target=one, args=(i,)) for i in range(len(vids))]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=120)
    return results


def concurrency_asserts() -> list[dict]:
    out: list[dict] = []

    def note(cid: str, ok: bool, detail: str) -> None:
        out.append({"check_id": cid, "status": "PASS" if ok else "FAIL", "detail": detail})

    same = setup_flow("SPK-CC-SAME")
    rs = race_publish([same, same])
    ok = all(r.returncode == 0 for r in rs)
    import json as js
    ords = []
    for r in rs:
        try:
            doc = js.loads(r.stdout.strip().splitlines()[-1])
            ords.append((doc.get("version_ordinal"), doc.get("idempotent")))
        except Exception:
            ords.append((None, None))
    converged = ok and ords[0][0] is not None and ords[0][0] == ords[1][0]
    pubrows = scalar("SELECT count(*) FROM public.service_workflow_audit WHERE action = 'routine_published' AND entity_id = '%s'" % same)
    status = scalar("SELECT status FROM public.service_routine_versions WHERE id = '%s'" % same)
    note("SPK-CC-same", converged and pubrows == "1" and status == "published",
         f"ordinals={ords} published_rows={pubrows} status={status} rc={[r.returncode for r in rs]}")

    va = setup_flow("SPK-CC-A")
    vb = setup_flow("SPK-CC-B")
    rs = race_publish([va, vb])
    oka = scalar("SELECT version_ordinal FROM public.service_routine_versions WHERE id = '%s'" % va)
    okb = scalar("SELECT version_ordinal FROM public.service_routine_versions WHERE id = '%s'" % vb)
    sta = scalar("SELECT status FROM public.service_routine_versions WHERE id = '%s'" % va)
    stb = scalar("SELECT status FROM public.service_routine_versions WHERE id = '%s'" % vb)
    note("SPK-CC-distinct", all(r.returncode == 0 for r in rs) and oka == "1" and okb == "1"
         and sta == "published" and stb == "published",
         f"ordinals={oka},{okb} status={sta},{stb} rc={[r.returncode for r in rs]}")
    return out


def main() -> int:
    if RUNLOG.exists():
        RUNLOG.unlink()
    log("git check")
    head = run(["git", "rev-parse", "HEAD"], 30, "git-rev-parse", SRC).stdout.strip()
    if head != EXPECT:
        raise SystemExit(f"tree HEAD {head} != expected {EXPECT}; set LANEA_SRC/LANEA_EXPECT_SHA explicitly")
    HERE.mkdir(parents=True, exist_ok=True)
    log("stop old cluster")
    stop_cluster()
    if DATADIR.exists():
        shutil.rmtree(DATADIR, ignore_errors=True)
    DATADIR.mkdir(parents=True, exist_ok=True)
    log("initdb")
    r = run([str(PGBIN / "initdb"), "-D", str(DATADIR), "-U", PGUSER, "--auth=trust"], 180, "initdb")
    if r.returncode != 0:
        raise SystemExit(f"initdb failed:\n{r.stderr}")
    log("pg_ctl start (no-wait; readiness via wait_ready loop)")
    r = run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "-l", str(DATADIR / "pg.log"),
             "-o", f"-p {PORT} -c listen_addresses=127.0.0.1", "start"], 90, "pg_ctl-start",
            capture=False)
    if r.returncode != 0:
        tail = ""
        try:
            tail = "\n".join(open(DATADIR / "pg.log", encoding="utf-8", errors="replace").read().splitlines()[-10:])
        except OSError:
            pass
        raise SystemExit(f"pg_ctl start failed, pg.log tail:\n{tail}")
    log("wait_ready")
    wait_ready()
    log("db create")
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '{DB}' AND pid <> pg_backend_pid();")
    psql("postgres", f"DROP DATABASE IF EXISTS {DB};")
    psql("postgres", f"CREATE DATABASE {DB};")
    checks: list[dict] = []
    try:
        print("applying base + migrationΓÇª", flush=True)
        apply(DB, BASE, "base")
        apply(DB, MIG, "lane-a migration")
        print("running Spark probesΓÇª", flush=True)
        r = psql_file(DB, PROBES)
        if r.returncode != 0:
            raise SystemExit(f"probes failed:\n{r.stderr}\n{r.stdout[-5000:]}")
        checks += parse_rows(r.stdout)
        print("role-change probeΓÇª", flush=True)
        rc_good = '{"sections":[{"kind":"safety","items":[{"id":"sg1","type":"safety_gate"}]}]}'
        psql(DB, "SET ROLE ra_auth; SELECT set_config('app.b1_uid','%s',false); "
                 "SELECT public.create_service_routine_draft('SPK-RC-1','t','','','%s',ARRAY['saw']);" % (ADMIN2, rc_good))
        rcvid = scalar("""SELECT v.id FROM public.service_routine_versions v
            JOIN public.service_routines ro ON ro.id = v.routine_id WHERE ro.code = 'SPK-RC-1'""")
        psql(DB, "SET ROLE ra_auth; SELECT set_config('app.b1_uid','%s',false); "
                 "SELECT public.submit_service_routine_for_review('%s');" % (ADMIN2, rcvid))
        r = run([str(PGBIN / "psql"), f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={DB}",
                       "-v", "ON_ERROR_STOP=1", "-c",
                       "UPDATE public.profiles SET role = 'support' WHERE id = '%s';" % ADMIN2], 60, "role-flip-down")
        if r.returncode != 0:
            raise SystemExit(f"role flip failed:\n{r.stderr}")
        r = psql_file(DB, RC_PROBES)
        r2 = run([str(PGBIN / "psql"), f"host=127.0.0.1 port={PORT} user={PGUSER} dbname={DB}",
                        "-c", "UPDATE public.profiles SET role = 'admin' WHERE id = '%s';" % ADMIN2], 60, "role-flip-up")
        if r2.returncode != 0:
            raise SystemExit(f"role restore failed:\n{r2.stderr}")
        if r.returncode != 0:
            raise SystemExit(f"role-change probes failed:\n{r.stderr}\n{r.stdout[-3000:]}")
        checks += parse_rows(r.stdout)
        print("audit assertsΓÇª", flush=True)
        checks += audit_asserts()
        print("concurrencyΓÇª", flush=True)
        checks += concurrency_asserts()
        passed = sum(1 for c in checks if c["status"] == "PASS")
        failed = [c for c in checks if c["status"] != "PASS"]
        payload = {"label": "Spark independent", "contract_tip": CONTRACT, "implementation_sha": head, "expected_sha": EXPECT,
                   "migration": "supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql",
                   "counts": {"PASS": passed, "FAIL": len(failed), "TOTAL": len(checks)},
                   "checks": checks}
        OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        print(json.dumps(payload["counts"], indent=2))
        for c in failed:
            print(f"FAIL {c['check_id']}: {c['detail']}")
        print(f"wrote {OUT}")
        return 0 if not failed else 1
    finally:
        stop_cluster()


if __name__ == "__main__":
    sys.exit(main())
