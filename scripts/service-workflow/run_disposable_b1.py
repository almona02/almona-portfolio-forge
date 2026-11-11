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

def _git_sha() -> str:
    try:
        return subprocess.check_output(
            ["git", "rev-parse", "HEAD"], cwd=ROOT, text=True
        ).strip()
    except Exception:
        return "UNKNOWN"


results: dict = {"tested_sha": _git_sha(), "sql": {}, "concurrency": {}}


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
    OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print("wrote", OUT)
    # B1 acceptance: zero FAIL and zero required-SKIP. DEFER is excluded.
    n_fail = results["sql"].get("n_fail", 1)
    n_skip = results["sql"].get("n_skip", 0)
    k_blocked = [k for k, v in results["concurrency"].items()
                 if v["status"] not in ("PASS", "SKIP")]
    k_skip = [k for k, v in results["concurrency"].items()
              if v["status"] == "SKIP"]
    if n_fail or k_blocked:
        print(f"B1 BLOCKED: failures present (sql_fail={n_fail} k={k_blocked})")
        return 1
    if n_skip or k_skip:
        print(f"B1 BLOCKED: {n_skip} required SQL checks SKIP, "
              f"concurrency SKIP={k_skip} (pending B1 implementation)")
        return 2
    print("B1 ACCEPTED: zero FAIL, zero required-SKIP")
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

    def k_skip(kid: str) -> None:
        results["concurrency"][kid] = {
            "status": "SKIP", "detail": "pending B1 implementation"}
        print("SKIP", kid, "pending B1 implementation")

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


if __name__ == "__main__":
    raise SystemExit(main())
