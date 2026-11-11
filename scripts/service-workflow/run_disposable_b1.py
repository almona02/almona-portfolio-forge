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
B1_MIGRATION = ROOT / "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"
BATTERY = ROOT / "scripts/service-workflow/disposable_b1_battery.sql"
OUT = ROOT / ".artifacts/slice0/service-workflow/disposable_b1_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = Path("C:/temp/b1-disposable")
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
    r = psql_file(db, B1_MIGRATION)
    if r.returncode != 0:
        raise SystemExit(f"apply {B1_MIGRATION.name} failed: {r.stderr}\n{r.stdout}")

    persist = BATTERY.read_text(encoding="utf-8").replace(
        "SELECT check_id, status, detail FROM b1_eval ORDER BY check_id;\n"
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip FROM b1_eval;",
        "CREATE TABLE IF NOT EXISTS public.b1_results (check_id text PRIMARY KEY, status text, detail text);\n"
        "TRUNCATE public.b1_results;\n"
        "INSERT INTO public.b1_results SELECT check_id, status, detail FROM b1_eval;\n"
        "SELECT check_id, status, detail FROM public.b1_results ORDER BY check_id;\n"
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, COUNT(*) FILTER (WHERE status='FAIL') AS fail, COUNT(*) FILTER (WHERE status='SKIP') AS skip FROM public.b1_results;",
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
                          "COUNT(*) FILTER (WHERE status='SKIP') AS skip FROM public.b1_results;")
        fails = [ln for ln in rows.stdout.splitlines()
                 if "| FAIL " in ln or ln.strip().startswith("FAIL")]
        results["sql"] = {"ok": not fails, "counts": counts.stdout.strip(),
                          "rows": rows.stdout}
        print(counts.stdout)

    run_concurrency(db)
    OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("wrote", OUT)
    sql_ok = results["sql"].get("ok", False)
    k_ok = all(v["status"] in ("PASS", "SKIP")
               for v in results["concurrency"].values())
    return 0 if (sql_ok and k_ok) else 1


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

    # K2: same-job race — T1 planned→in_progress wins; T2 →cancelled fails under lock.
    try:
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT to_regclass('public.service_jobs') IS NOT NULL "
                    "AND EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'govern_job_transition');")
        present = cur.fetchone()[0]
        if not present:
            c.close()
            results["concurrency"]["K2"] = {
                "status": "SKIP", "detail": "pending B1 implementation"}
            print("SKIP K2 pending B1 implementation")
            return
        cur.execute("SET app.b1_uid = %s;", (SUPPORT,))
        cur.execute(
            "INSERT INTO public.service_tickets (ticket_number, user_id, title, status)"
            " VALUES ('B1-K2', '11111111-1111-1111-1111-111111111111', 'k2', 'open')"
            " RETURNING id;")
        tid = cur.fetchone()[0]
        cur.execute(
            "SELECT (public.create_service_job(%s, 'race', true, 'k2')).id;", (tid,))
        jid = cur.fetchone()[0]
        cur.execute("SELECT public.govern_job_transition(%s, 'planned', 'k2', NULL);", (jid,))
        c.close()
        outcome2: dict = {}

        def k2_t1():
            c1 = psycopg2.connect(**dsn)
            try:
                cur1 = c1.cursor()
                cur1.execute("SET app.b1_uid = %s;", (SUPPORT,))
                cur1.execute(
                    "SELECT public.govern_job_transition(%s, 'in_progress', 'k2', NULL);",
                    (jid,))
                time.sleep(3)
                c1.commit()
                outcome2["t1"] = "ok"
            except Exception as e:  # noqa: BLE001
                outcome2["t1"] = f"ERR {getattr(e, 'pgcode', '?')} {e}"
                c1.rollback()
            finally:
                c1.close()

        def k2_t2():
            time.sleep(0.7)
            c2 = psycopg2.connect(**dsn)
            c2.autocommit = True
            try:
                cur2 = c2.cursor()
                cur2.execute("SET app.b1_uid = %s;", (SUPPORT,))
                cur2.execute("SET statement_timeout = '15s';")
                # Illegal from planned and still illegal from in_progress without report.
                cur2.execute(
                    "SELECT public.govern_job_transition(%s, 'completed', 'k2 race', NULL);",
                    (jid,))
                outcome2["t2"] = "UNEXPECTED-OK"
            except Exception as e:  # noqa: BLE001
                outcome2["t2"] = getattr(e, "pgcode", "?")
            finally:
                c2.close()

        a, b = threading.Thread(target=k2_t1), threading.Thread(target=k2_t2)
        a.start(); b.start(); a.join(30); b.join(30)
        c = psycopg2.connect(**dsn)
        c.autocommit = True
        cur = c.cursor()
        cur.execute("SELECT state FROM public.service_jobs WHERE id = %s;", (jid,))
        final = cur.fetchone()[0]
        c.close()
        ok = (outcome2.get("t1") == "ok" and outcome2.get("t2") == "23514"
              and final == "in_progress")
        k_note("K2", ok, f"t1={outcome2.get('t1')} t2={outcome2.get('t2')} final={final}")
    except Exception as e:  # noqa: BLE001
        k_note("K2", False, f"harness: {e}")


if __name__ == "__main__":
    raise SystemExit(main())
