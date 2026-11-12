#!/usr/bin/env python3
"""Local disposable B1 battery (service workflow data contract + state guards).

Self-managed PG17 cluster (port 55442). Applies stub base + REAL Slice 0
boundary migration + REAL ticket-number trigger section, runs the SQL battery
(compat must PASS; B1-contract checks SKIP until implemented), then runs
concurrency probes over two connections. Stops and removes the cluster after.

Does NOT touch staging/production remotes.
"""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_b1_base.sql"
MIGRATION = ROOT / "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"
TKT_MIGRATION = ROOT / "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"
# Frozen implementations under test, extracted from git objects by SHA
# (never from my worktree files, never merged branches).
B1_FROZEN_SHA = "7a8307395b79df677a96f77cd993a77351b5805c"
B1_MIGRATION_GIT_PATH = "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"
# B2: (None, None) until Cursor freezes; then set SHA + git path.
B2_FROZEN_SHA: str | None = "8f2acc4e806e70e12e87a24dcbebaef78e63e085"
B2_MIGRATION_GIT_PATH: str | None = "supabase/migrations/20261111220000_service_workflow_b2_assignment.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_b1_battery.sql"
OUT = ROOT / ".artifacts/slice0/service-workflow/disposable_b1_results.json"
# Per-freeze evidence (old failing evidence preserved separately, never overwritten).
OUT_SHA = ROOT / ".artifacts/slice0/service-workflow/disposable_b1_results_7a830739.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
# Under .artifacts (gitignored): C:/temp is swept by an external cleaner that
# deleted the live cluster dir mid-run twice (server PANIC, K-phase refused).
DATADIR = ROOT / ".artifacts/slice0/service-workflow/_b1_cluster"
PORT = "55442"
USER = getpass.getuser()
SUPPORT = "55555555-5555-5555-5555-555555555555"

results: dict = {"sql": {}, "concurrency": {}}


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        text=True, capture_output=True, check=False,
    )


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, check=False,
    )


def k_note(check_id: str, ok: bool, detail: str) -> None:
    results["concurrency"][check_id] = {
        "status": "PASS" if ok else "FAIL", "detail": detail[:300]}
    print(("PASS" if ok else "FAIL"), check_id, detail[:120])


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    if DATADIR.exists():
        shutil.rmtree(DATADIR)
    r = subprocess.run([str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8"],
                       text=True, capture_output=True)
    if r.returncode != 0:
        raise SystemExit(f"initdb failed: {r.stderr}")
    # NB: never capture_output on pg_ctl start — the daemonized postmaster
    # inherits the pipes and run() would wait for EOF forever.
    r = subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR),
         "-o", f"-p {PORT} -c listen_addresses=127.0.0.1",
         "-l", str(OUT.parent / "b1_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed (see b1_cluster.log)")
    try:
        return run_all()
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


def run_all() -> int:
    db = "b1_disposable"
    psql("postgres", f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                     f"WHERE datname = '{db}' AND pid <> pg_backend_pid();")
    for stmt in (f"DROP DATABASE IF EXISTS {db};", f"CREATE DATABASE {db};"):
        r = psql("postgres", stmt)
        if r.returncode != 0:
            raise SystemExit(f"db setup failed ({stmt}): {r.stderr}")
    for path in (BASE, MIGRATION):
        r = psql_file(db, path)
        if r.returncode != 0:
            raise SystemExit(f"apply {path.name} failed: {r.stderr}\n{r.stdout}")
    # Real ticket-number trigger section (storage section needs hosted schema).
    lines = TKT_MIGRATION.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    sec = OUT.parent / "_b1_tkt_section2.sql"
    sec.write_text("".join(lines[start:]), encoding="utf-8")
    r = psql_file(db, sec)
    if r.returncode != 0:
        raise SystemExit(f"TKT section failed: {r.stderr}\n{r.stdout}")
    b1f = OUT.parent / "_b1_frozen_migration.sql"
    r = subprocess.run(["git", "show", f"{B1_FROZEN_SHA}:{B1_MIGRATION_GIT_PATH}"],
                       capture_output=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise SystemExit(f"cannot extract B1 migration at {B1_FROZEN_SHA}")
    b1f.write_bytes(r.stdout)
    r = psql_file(db, b1f)
    if r.returncode != 0:
        raise SystemExit(f"B1 migration failed: {r.stderr}\n{r.stdout}")
    results["frozen_sha"] = B1_FROZEN_SHA
    results["b1_migration"] = B1_MIGRATION_GIT_PATH
    if B2_FROZEN_SHA and B2_MIGRATION_GIT_PATH:
        b2f = OUT.parent / "_b2_frozen_migration.sql"
        r = subprocess.run(["git", "show", f"{B2_FROZEN_SHA}:{B2_MIGRATION_GIT_PATH}"],
                           capture_output=True, cwd=str(ROOT))
        if r.returncode != 0:
            raise SystemExit(f"cannot extract B2 migration at {B2_FROZEN_SHA}")
        b2f.write_bytes(r.stdout)
        r = psql_file(db, b2f)
        if r.returncode != 0:
            raise SystemExit(f"B2 migration failed: {r.stderr}\n{r.stdout}")
        results["b2_frozen_sha"] = B2_FROZEN_SHA
        results["b2_migration"] = B2_MIGRATION_GIT_PATH
    else:
        results["b2_frozen_sha"] = "pending"
        print("no B2 migration configured; B2 checks will SKIP")

    persist = BATTERY.read_text(encoding="utf-8").replace(
        "SELECT check_id, status, detail FROM b1_eval ORDER BY check_id;\n"
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip, COUNT(*) FILTER (WHERE status='DEFER') AS defer FROM b1_eval;",
        "CREATE TABLE IF NOT EXISTS public.b1_results (check_id text PRIMARY KEY, status text, detail text);\n"
        "TRUNCATE public.b1_results;\n"
        "INSERT INTO public.b1_results SELECT check_id, status, detail FROM b1_eval;\n"
        "SELECT check_id, status, detail FROM public.b1_results ORDER BY check_id;\n"
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip, COUNT(*) FILTER (WHERE status='DEFER') AS defer FROM public.b1_results;",
    )
    tmp = OUT.parent / "_b1_battery_run.sql"
    tmp.write_text(persist, encoding="utf-8")
    r = psql_file(db, tmp)
    print(r.stdout[-3000:] if len(r.stdout) > 3000 else r.stdout)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        results["sql"] = {"ok": False, "stderr": r.stderr[-2000:]}
    else:
        rows = psql(db, "SELECT check_id, status, detail FROM public.b1_results ORDER BY 1;")
        counts = psql(db, "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
                          "COUNT(*) FILTER (WHERE status='FAIL') AS fail, "
                          "COUNT(*) FILTER (WHERE status='SKIP') AS skip, "
                          "COUNT(*) FILTER (WHERE status='DEFER') AS defer FROM public.b1_results;")
        fails = [ln for ln in rows.stdout.splitlines()
                 if "| FAIL " in ln or ln.strip().startswith("FAIL")]
        skips = [ln for ln in rows.stdout.splitlines() if "| SKIP " in ln]
        results["sql"] = {"ok": not fails, "counts": counts.stdout.strip(),
                          "rows": rows.stdout, "n_fail": len(fails),
                          "n_skip": len(skips)}
        print(counts.stdout)

    run_concurrency(db)
    tag = (B2_FROZEN_SHA[:8] if B2_FROZEN_SHA else "b1only") + "_on_" + B1_FROZEN_SHA[:8]
    out = ROOT / f".artifacts/slice0/service-workflow/disposable_b1b2_results_{tag}.json"
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("wrote", out)
    # Per-area verdicts. B1 = preserved baseline (all non-S checks + K1-K4);
    # B2 = S-series + K5/K6/K7. DEFER excluded from both gates.
    rows_text = results["sql"].get("rows", "")

    def row_status(check_id: str) -> str:
        for ln in rows_text.splitlines():
            cells = [c.strip() for c in ln.split("|")]
            if cells and cells[0] == check_id and len(cells) > 1:
                return cells[1]
        return "?"

    b1_ids = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10",
              "J1", "J2", "J3", "J4", "J5", "J6", "J7",
              "V1", "V2", "V3", "V4", "V6", "R1", "R2", "M1", "M2", "M3",
              "X1", "X1b", "X2", "X3", "X4", "X4b", "X5", "X6",
              "W1", "W2", "W3", "W4", "P1", "P2", "F1", "CC1",
              "A1", "A2", "A3", "A4", "A5", "RV1", "ACK1"]
    b2_ids = [f"S{i}" for i in range(1, 23)]
    b1_fail = [i for i in b1_ids if row_status(i) == "FAIL"]
    b1_skip = [i for i in b1_ids if row_status(i) == "SKIP"]
    b2_fail = [i for i in b2_ids if row_status(i) == "FAIL"]
    b2_skip = [i for i in b2_ids if row_status(i) == "SKIP"]
    k = results["concurrency"]
    b1_kbad = [kk for kk in ("K1", "K2", "K3", "K4")
               if k.get(kk, {}).get("status") not in ("PASS", "SKIP")]
    b1_kskip = [kk for kk in ("K1", "K2", "K3", "K4")
                if k.get(kk, {}).get("status") == "SKIP"]
    b2_kbad = [kk for kk in ("K5", "K6", "K7")
               if k.get(kk, {}).get("status") not in ("PASS", "SKIP")]
    b2_kskip = [kk for kk in ("K5", "K6", "K7")
                if k.get(kk, {}).get("status") == "SKIP"]
    results["b1_area"] = {"fail": b1_fail, "skip": b1_skip, "k_bad": b1_kbad,
                          "k_skip": b1_kskip}
    results["b2_area"] = {"fail": b2_fail, "skip": b2_skip, "k_bad": b2_kbad,
                          "k_skip": b2_kskip}
    tag = (B2_FROZEN_SHA[:8] if B2_FROZEN_SHA else "b1only") + "_on_" + B1_FROZEN_SHA[:8]
    out = ROOT / f".artifacts/slice0/service-workflow/disposable_b1b2_results_{tag}.json"
    out.write_text(json.dumps(results, indent=2), encoding="utf-8")
    if b1_fail or b1_kbad:
        print(f"B1 BASELINE BROKEN: sql={b1_fail} k={b1_kbad}")
    elif b1_skip or b1_kskip:
        print(f"B1 BASELINE BLOCKED: skip={b1_skip + b1_kskip}")
    else:
        print("B1 BASELINE: green (49/0/0/5 + K1-K4 PASS)")
    if b2_fail or b2_kbad:
        print(f"B2 BLOCKED: failures present (sql={b2_fail} k={b2_kbad})")
        return 1
    if b2_skip or b2_kskip:
        print(f"B2 BLOCKED: {len(b2_skip)} required SQL SKIP, "
              f"concurrency SKIP={b2_kskip} (pending B2 implementation)")
        return 2
    if b1_fail or b1_kbad or b1_skip or b1_kskip:
        print("B2 checks green but B1 baseline regressed or skipping")
        return 3
    print("B1 BASELINE + B2 ACCEPTED: zero FAIL, zero required-SKIP")
    return 0


def run_concurrency(db: str) -> None:
    import psycopg2

    dsn = {"host": "127.0.0.1", "port": int(PORT), "user": USER, "dbname": db}

    def setup_ticket(num: str, status: str) -> str:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute(
            "INSERT INTO public.service_tickets (ticket_number, user_id, title, status)"
            " VALUES (%s, '11111111-1111-1111-1111-111111111111', %s, %s)"
            " RETURNING id;", (num, num, status))
        tid = cur.fetchone()[0]
        c.close()
        return tid

    def audit_n(ticket_id: str) -> int:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT count(*) FROM public.ticket_governance_audit WHERE ticket_id = %s;",
                    (ticket_id,))
        n = cur.fetchone()[0]
        c.close()
        return n

    def b2_present() -> bool:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'assign_service_job');")
        present = cur.fetchone()[0]
        c.close()
        return bool(present)

    def ensure_present() -> bool:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'ensure_default_service_job');")
        present = cur.fetchone()[0]
        c.close()
        return bool(present)

    def setup_job(num: str) -> str:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
        cur.execute(
            "INSERT INTO public.service_tickets (ticket_number, user_id, title, status)"
            " VALUES (%s, '11111111-1111-1111-1111-111111111111', %s, 'open')"
            " RETURNING id;", (num, num))
        tid = cur.fetchone()[0]
        cur.execute("SELECT (public.create_service_job(%s, %s, true, 'k')).id;",
                    (tid, num))
        jid = cur.fetchone()[0]
        c.close()
        return jid

    TECH1 = "33333333-3333-3333-3333-333333333333"
    TECH2 = "44444444-4444-4444-4444-444444444444"

    # K1: same-ticket race — T1 assigned->in_progress wins; T2 ->cancelled fails.
    try:
        t1 = setup_ticket("B1-K1", "assigned")
        n0 = audit_n(t1)
        outcome: dict = {}

        def t1_run():
            c = psycopg2.connect(**dsn)
            try:
                cur = c.cursor()
                cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
                cur.execute("SELECT public.govern_ticket_transition(%s, 'in_progress', 'k1', NULL);",
                            (t1,))
                time.sleep(3)
                c.commit()
                outcome["t1"] = "ok"
            except Exception as e:  # noqa: BLE001
                outcome["t1"] = f"ERR {getattr(e, 'pgcode', '?')} {e}"
                c.rollback()
            finally:
                c.close()

        def t2_run():
            time.sleep(0.7)
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            try:
                cur = c.cursor()
                cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
                cur.execute("SET statement_timeout = '15s';")
                cur.execute("SELECT public.govern_ticket_transition(%s, 'cancelled', 'k1', NULL);",
                            (t1,))
                outcome["t2"] = "UNEXPECTED-OK"
            except Exception as e:  # noqa: BLE001
                outcome["t2"] = getattr(e, "pgcode", "?")
            finally:
                c.close()

        a, b = threading.Thread(target=t1_run), threading.Thread(target=t2_run)
        a.start()
        b.start()
        a.join(30)
        b.join(30)
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT status FROM public.service_tickets WHERE id = %s;", (t1,))
        final = cur.fetchone()[0]
        c.close()
        ok = (outcome.get("t1") == "ok" and outcome.get("t2") == "23514"
              and final == "in_progress" and audit_n(t1) == n0 + 1)
        k_note("K1", ok, f"t1={outcome.get('t1')} t2={outcome.get('t2')} final={final}")
    except Exception as e:  # noqa: BLE001
        k_note("K1", False, f"harness: {e}")

    # K3: different tickets in parallel — both succeed, no false contention.
    try:
        ta = setup_ticket("B1-K3A", "open")
        tb = setup_ticket("B1-K3B", "open")
        outcome3: dict = {}

        def worker(name: str, tid: str):
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            try:
                cur = c.cursor()
                cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
                cur.execute("SELECT public.govern_ticket_transition(%s, 'assigned', 'k3', NULL);",
                            (tid,))
                outcome3[name] = "ok"
            except Exception as e:  # noqa: BLE001
                outcome3[name] = f"ERR {getattr(e, 'pgcode', '?')} {e}"
            finally:
                c.close()

        threads = [threading.Thread(target=worker, args=("a", ta)),
                   threading.Thread(target=worker, args=("b", tb))]
        for th in threads:
            th.start()
        for th in threads:
            th.join(30)
        k_note("K3", outcome3 == {"a": "ok", "b": "ok"}, str(outcome3))
    except Exception as e:  # noqa: BLE001
        k_note("K3", False, f"harness: {e}")

    def b1_present() -> bool:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT to_regclass('public.service_jobs') IS NOT NULL "
                    "AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'govern_job_transition') "
                    "AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_service_job');")
        present = cur.fetchone()[0]
        c.close()
        return bool(present)

    def k_skip(kid: str, area: str = "B1") -> None:
        results["concurrency"][kid] = {
            "status": "SKIP", "detail": f"pending {area} implementation"}
        print("SKIP", kid, f"pending {area} implementation")

    # K2: same-job race — T1 planned->cancelled wins; T2 ->in_progress fails.
    try:
        if not b1_present():
            k_skip("K2")
        else:
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            cur = c.cursor()
            cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
            cur.execute(
                "INSERT INTO public.service_tickets (ticket_number, user_id, title, status)"
                " VALUES ('B1-K2T', '11111111-1111-1111-1111-111111111111', 'k2', 'open')"
                " RETURNING id;")
            kt = cur.fetchone()[0]
            cur.execute("SELECT (public.create_service_job(%s, 'k2', true, 'k2')).id;",
                        (kt,))
            kj = cur.fetchone()[0]
            cur.execute("SELECT public.govern_job_transition(%s, 'planned', 'k2', NULL);",
                        (kj,))
            cur.execute("SELECT count(*) FROM public.service_workflow_audit;")
            kn0 = cur.fetchone()[0]
            c.close()
            outcome2: dict = {}

            def k2_t1():
                cc = psycopg2.connect(**dsn)
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SELECT public.govern_job_transition(%s, 'cancelled', 'k2', NULL);",
                               (kj,))
                    time.sleep(3)
                    cc.commit()
                    outcome2["t1"] = "ok"
                except Exception as e:  # noqa: BLE001
                    outcome2["t1"] = f"ERR {getattr(e, 'pgcode', '?')} {e}"
                    cc.rollback()
                finally:
                    cc.close()

            def k2_t2():
                time.sleep(0.7)
                cc = psycopg2.connect(**dsn)
                cc.autocommit = True
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SET statement_timeout = '15s';")
                    cu.execute("SELECT public.govern_job_transition(%s, 'in_progress', 'k2', NULL);",
                               (kj,))
                    outcome2["t2"] = "UNEXPECTED-OK"
                except Exception as e:  # noqa: BLE001
                    outcome2["t2"] = getattr(e, "pgcode", "?")
                finally:
                    cc.close()

            a2, b2 = threading.Thread(target=k2_t1), threading.Thread(target=k2_t2)
            a2.start()
            b2.start()
            a2.join(30)
            b2.join(30)
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            cur = c.cursor()
            cur.execute("SELECT count(*) FROM public.service_workflow_audit;")
            kn1 = cur.fetchone()[0]
            c.close()
            ok2 = (outcome2.get("t1") == "ok" and outcome2.get("t2") == "23514"
                   and kn1 == kn0 + 1)
            k_note("K2", ok2, f"t1={outcome2.get('t1')} t2={outcome2.get('t2')}")
    except Exception as e:  # noqa: BLE001
        k_note("K2", False, f"harness: {e}")

    # K4: job creation vs ticket closure race — exactly one coherent outcome:
    # (create wins -> close denied, ticket in_progress, 1 job) OR
    # (close wins -> create fails, ticket closed, 0 jobs).
    try:
        if not b1_present():
            k_skip("K4")
        else:
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            cur = c.cursor()
            cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
            cur.execute(
                "INSERT INTO public.service_tickets (ticket_number, user_id, title, status)"
                " VALUES ('B1-K4T', '11111111-1111-1111-1111-111111111111', 'k4', 'open')"
                " RETURNING id;")
            k4t = cur.fetchone()[0]
            for st in ("assigned", "in_progress", "resolved"):
                summ = "'done'" if st == "resolved" else "NULL"
                cur.execute(
                    f"SELECT public.govern_ticket_transition(%s, '{st}', 'k4', {summ});",
                    (k4t,))
            c.close()
            outcome4: dict = {}

            def k4_t1():
                cc = psycopg2.connect(**dsn)
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SELECT public.create_service_job(%s, 'race', true, 'k4');",
                               (k4t,))
                    time.sleep(3)
                    cc.commit()
                    outcome4["create"] = "ok"
                except Exception as e:  # noqa: BLE001
                    outcome4["create"] = getattr(e, "pgcode", "?")
                    cc.rollback()
                finally:
                    cc.close()

            def k4_t2():
                time.sleep(0.7)
                cc = psycopg2.connect(**dsn)
                cc.autocommit = True
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SET statement_timeout = '20s';")
                    cu.execute("SELECT public.govern_ticket_transition(%s, 'closed', 'k4', NULL);",
                               (k4t,))
                    outcome4["close"] = "ok"
                except Exception as e:  # noqa: BLE001
                    outcome4["close"] = getattr(e, "pgcode", "?")
                finally:
                    cc.close()

            a4, b4 = threading.Thread(target=k4_t1), threading.Thread(target=k4_t2)
            a4.start()
            b4.start()
            a4.join(40)
            b4.join(40)
            c = psycopg2.connect(**dsn)
            c.autocommit = True
            cur = c.cursor()
            cur.execute("SELECT status FROM public.service_tickets WHERE id = %s;", (k4t,))
            k4state = cur.fetchone()[0]
            # job count via FK discovery (column-name agnostic)
            cur.execute(
                "SELECT a.attname FROM pg_constraint c "
                "JOIN pg_class ch ON ch.oid = c.conrelid "
                "JOIN pg_class pa ON pa.oid = c.confrelid "
                "JOIN pg_attribute a ON a.attrelid = ch.oid AND a.attnum = c.conkey[1] "
                "WHERE c.contype = 'f' AND ch.relname = 'service_jobs' "
                "AND pa.relname = 'service_tickets' AND array_length(c.conkey, 1) = 1 LIMIT 1;")
            fkrow = cur.fetchone()
            if fkrow:
                cur.execute(f"SELECT count(*) FROM public.service_jobs WHERE {fkrow[0]} = %s;",
                            (k4t,))
                k4jobs = cur.fetchone()[0]
            else:
                k4jobs = -1
            c.close()
            create_ok = outcome4.get("create") == "ok"
            close_ok = outcome4.get("close") == "ok"
            coherent_a = (create_ok and not close_ok and k4state == "in_progress"
                          and k4jobs == 1)
            coherent_b = (close_ok and not create_ok and k4state == "closed"
                          and k4jobs == 0)
            k_note("K4", coherent_a or coherent_b,
                   f"create={outcome4.get('create')} close={outcome4.get('close')} "
                   f"state={k4state} jobs={k4jobs}")
    except Exception as e:  # noqa: BLE001
        k_note("K4", False, f"harness: {e}")

    def audit_n_job() -> int:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT count(*) FROM public.service_workflow_audit;")
        n = cur.fetchone()[0]
        c.close()
        return n

    def job_assignee(jid: str):
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT assigned_technician_id FROM public.service_jobs WHERE id = %s;",
                    (jid,))
        row = cur.fetchone()
        c.close()
        return row[0] if row else None

    # K5: same-tech concurrent first-assign — both succeed, one assignee, audit <= +2.
    try:
        if not b2_present():
            k_skip("K5", "B2")
        else:
            kj = setup_job("B1-K5J")
            kn0 = audit_n_job()
            out5: dict = {}

            def k5_t1():
                cc = psycopg2.connect(**dsn)
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SELECT public.assign_service_job(%s, %s, 'k5', NULL);",
                               (kj, TECH1))
                    time.sleep(3)
                    cc.commit()
                    out5["t1"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out5["t1"] = getattr(e, "pgcode", "?")
                    cc.rollback()
                finally:
                    cc.close()

            def k5_t2():
                time.sleep(0.7)
                cc = psycopg2.connect(**dsn)
                cc.autocommit = True
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SET statement_timeout = '15s';")
                    cu.execute("SELECT public.assign_service_job(%s, %s, 'k5', NULL);",
                               (kj, TECH1))
                    out5["t2"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out5["t2"] = getattr(e, "pgcode", "?")
                finally:
                    cc.close()

            a5, b5 = threading.Thread(target=k5_t1), threading.Thread(target=k5_t2)
            a5.start()
            b5.start()
            a5.join(30)
            b5.join(30)
            fin5 = job_assignee(kj)
            ok5 = (out5.get("t1") == "ok" and out5.get("t2") == "ok"
                   and str(fin5) == TECH1 and audit_n_job() - kn0 <= 2)
            k_note("K5", ok5, f"t1={out5.get('t1')} t2={out5.get('t2')} assignee={fin5}")
    except Exception as e:  # noqa: BLE001
        k_note("K5", False, f"harness: {e}")

    # K6: different-tech concurrent assign — serialized; final is exactly one
    # winner and audit reflects the serialized order (1-2 rows, last wins).
    try:
        if not b2_present():
            k_skip("K6", "B2")
        else:
            kj = setup_job("B1-K6J")
            kn0 = audit_n_job()
            out6: dict = {}

            def k6_t1():
                cc = psycopg2.connect(**dsn)
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SELECT public.assign_service_job(%s, %s, 'k6-t1', NULL);",
                               (kj, TECH1))
                    time.sleep(3)
                    cc.commit()
                    out6["t1"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out6["t1"] = getattr(e, "pgcode", "?")
                    cc.rollback()
                finally:
                    cc.close()

            def k6_t2():
                time.sleep(0.7)
                cc = psycopg2.connect(**dsn)
                cc.autocommit = True
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SET statement_timeout = '15s';")
                    cu.execute("SELECT public.assign_service_job(%s, %s, 'k6-t2', NULL);",
                               (kj, TECH2))
                    out6["t2"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out6["t2"] = getattr(e, "pgcode", "?")
                finally:
                    cc.close()

            a6, b6 = threading.Thread(target=k6_t1), threading.Thread(target=k6_t2)
            a6.start()
            b6.start()
            a6.join(30)
            b6.join(30)
            fin6 = job_assignee(kj)
            delta6 = audit_n_job() - kn0
            ok6 = (out6.get("t1") == "ok" and out6.get("t2") == "ok"
                   and str(fin6) == TECH2 and delta6 == 2)
            k_note("K6", ok6, f"t1={out6.get('t1')} t2={out6.get('t2')} "
                              f"final={fin6} audit+={delta6}")
    except Exception as e:  # noqa: BLE001
        k_note("K6", False, f"harness: {e}")

    # K7: concurrent ensure_default_service_job — both succeed, exactly one
    # Job 1 (sequence 1), one history row, assignee = TECH1. Retry/double
    # submit must not create a second default job.
    try:
        if not ensure_present():
            k_skip("K7", "B2")
        else:
            kt = setup_ticket("B1-K7T", "open")
            kn0 = audit_n_job()
            out7: dict = {}

            def k7_t1():
                cc = psycopg2.connect(**dsn)
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SELECT (public.ensure_default_service_job(%s, %s, 'Job 1', 'k7', NULL)).id;",
                               (kt, TECH1))
                    time.sleep(3)
                    cc.commit()
                    out7["t1"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out7["t1"] = getattr(e, "pgcode", "?")
                    cc.rollback()
                finally:
                    cc.close()

            def k7_t2():
                time.sleep(0.7)
                cc = psycopg2.connect(**dsn)
                cc.autocommit = True
                try:
                    cu = cc.cursor()
                    cu.execute("SET app.b1_uid = %s;", (SUPPORT,))
                    cu.execute("SET statement_timeout = '15s';")
                    cu.execute("SELECT (public.ensure_default_service_job(%s, %s, 'Job 1', 'k7', NULL)).id;",
                               (kt, TECH1))
                    out7["t2"] = "ok"
                except Exception as e:  # noqa: BLE001
                    out7["t2"] = getattr(e, "pgcode", "?")
                finally:
                    cc.close()

            a7, b7 = threading.Thread(target=k7_t1), threading.Thread(target=k7_t2)
            a7.start()
            b7.start()
            a7.join(30)
            b7.join(30)
            c7 = psycopg2.connect(**dsn)
            c7.autocommit = True
            cur7 = c7.cursor()
            cur7.execute("SELECT count(*), count(*) FILTER (WHERE job_sequence = 1) "
                         "FROM public.service_jobs WHERE ticket_id = %s;", (kt,))
            njobs, nseq1 = cur7.fetchone()
            cur7.execute("SELECT count(*) FROM public.service_job_assignment_history h "
                         "JOIN public.service_jobs j ON j.id = h.job_id "
                         "WHERE j.ticket_id = %s;", (kt,))
            nhist = cur7.fetchone()[0]
            cur7.execute("SELECT assigned_technician_id FROM public.service_jobs "
                         "WHERE ticket_id = %s LIMIT 1;", (kt,))
            fin7 = cur7.fetchone()[0]
            c7.close()
            delta7 = audit_n_job() - kn0
            ok7 = (out7.get("t1") == "ok" and out7.get("t2") == "ok"
                   and njobs == 1 and nseq1 == 1 and nhist == 1
                   and str(fin7) == TECH1)
            k_note("K7", ok7, f"t1={out7.get('t1')} t2={out7.get('t2')} "
                              f"jobs={njobs} seq1={nseq1} hist={nhist} "
                              f"assignee={fin7} audit+={delta7}")
    except Exception as e:  # noqa: BLE001
        k_note("K7", False, f"harness: {e}")


if __name__ == "__main__":
    raise SystemExit(main())
