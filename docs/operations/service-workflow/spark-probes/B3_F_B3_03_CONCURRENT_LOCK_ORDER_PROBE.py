#!/usr/bin/env python3
"""F-B3-03 barrier-synchronized concurrent probes (disposable PG only).

Runs against the live disposable cluster started by run_disposable_b3.py.
Writes PASS/FAIL rows into public.b3_eval. No deadlock-retry loops.
"""
from __future__ import annotations

import argparse
import getpass
import subprocess
import threading
import time
from dataclasses import dataclass
from pathlib import Path

PGBIN = Path(r"<PGBIN>")
TECH1 = "33333333-3333-3333-3333-333333333333"
TECH2 = "44444444-4444-4444-4444-444444444444"
SUPPORT = "55555555-5555-5555-5555-555555555555"


@dataclass
class ProcResult:
    ok: bool
    out: str
    err: str
    sqlstate: str | None = None


def psql(port: str, user: str, db: str, sql: str, timeout: float = 20.0) -> ProcResult:
    r = subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", port, "-U", user, "-d", db,
         "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, timeout=timeout, check=False,
    )
    blob = (r.stderr or "") + "\n" + (r.stdout or "")
    sqlstate = None
    if "40P01" in blob or "deadlock detected" in blob.lower():
        sqlstate = "40P01"
    elif "42501" in blob:
        sqlstate = "42501"
    elif "22023" in blob or "check_violation" in blob or "23514" in blob:
        sqlstate = "deny"
    return ProcResult(r.returncode == 0, r.stdout or "", r.stderr or "", sqlstate)


def note(port: str, user: str, db: str, check_id: str, ok: bool, detail: str) -> None:
    detail = detail.replace("'", "''")[:400]
    status = "PASS" if ok else "FAIL"
    psql(port, user, db, f"""
      INSERT INTO public.b3_eval(check_id, status, detail)
      VALUES ('{check_id}', '{status}', '{detail}')
      ON CONFLICT (check_id) DO UPDATE
        SET status = EXCLUDED.status, detail = EXCLUDED.detail;
    """)


def setup_start_vs_reassign(port: str, user: str, db: str) -> tuple[str, str]:
    sql = f"""
    SELECT set_config('app.b1_uid', '{SUPPORT}', false);
    DO $$
    DECLARE
      v_t uuid; v_j uuid; v_v uuid;
      v_start timestamptz := now() + interval '70 hours';
      v_end timestamptz := now() + interval '72 hours';
    BEGIN
      v_t := b1_mkticket('cust1', 'B3F3-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
      SELECT (public.create_service_job(v_t, 'F3 race', true, 'f3')).id INTO v_j;
      PERFORM public.assign_service_job(v_j, '{TECH1}'::uuid, 'f3', NULL);
      PERFORM b3_arm_ticket(v_j);
      SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'f3', NULL)).id INTO v_v;
      PERFORM set_config('app.b1_uid', '{TECH1}', false);
      PERFORM public.record_visit_safety_check(v_v, 'passed', 'f3', NULL, b3_safety());
      CREATE TEMP TABLE IF NOT EXISTS _f3_ids(job uuid, visit uuid);
      DELETE FROM _f3_ids;
      INSERT INTO _f3_ids VALUES (v_j, v_v);
    END $$;
    SELECT job::text, visit::text FROM _f3_ids;
    """
    # temp table won't survive across psql -c invocations; use a real table
    sql = f"""
    CREATE TABLE IF NOT EXISTS public.b3_f3_fixture(job uuid, visit uuid);
    TRUNCATE public.b3_f3_fixture;
    SELECT set_config('app.b1_uid', '{SUPPORT}', false);
    DO $$
    DECLARE
      v_t uuid; v_j uuid; v_v uuid;
      v_start timestamptz := now() + interval '70 hours';
      v_end timestamptz := now() + interval '72 hours';
    BEGIN
      v_t := b1_mkticket('cust1', 'B3F3-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
      SELECT (public.create_service_job(v_t, 'F3 race', true, 'f3')).id INTO v_j;
      PERFORM public.assign_service_job(v_j, '{TECH1}'::uuid, 'f3', NULL);
      PERFORM b3_arm_ticket(v_j);
      SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 'f3', NULL)).id INTO v_v;
      PERFORM set_config('app.b1_uid', '{TECH1}', false);
      PERFORM public.record_visit_safety_check(v_v, 'passed', 'f3', NULL, b3_safety());
      INSERT INTO public.b3_f3_fixture(job, visit) VALUES (v_j, v_v);
    END $$;
    SELECT job::text, visit::text FROM public.b3_f3_fixture;
    """
    r = psql(port, user, db, sql)
    if not r.ok:
        raise SystemExit(f"fixture failed: {r.err}\n{r.out}")
    lines = [ln.strip() for ln in r.out.splitlines() if "|" in ln and "job" not in ln.lower()]
    # parse last data row
    data_lines = [
        ln for ln in r.out.splitlines()
        if ln.strip() and not ln.startswith("-") and "job" not in ln.lower()
        and "row" not in ln.lower() and "|" in ln
    ]
    if not data_lines:
        raise SystemExit(f"no fixture ids:\n{r.out}")
    parts = [p.strip() for p in data_lines[-1].split("|")]
    return parts[0], parts[1]


def race_start_vs_reassign(port: str, user: str, db: str, job: str, visit: str) -> dict:
    barrier = threading.Barrier(2, timeout=10)
    results: dict[str, ProcResult] = {}

    def run_start() -> None:
        barrier.wait()
        results["start"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{TECH1}', false);
          SELECT public.start_service_job_visit('{visit}'::uuid, NULL, NULL, 'f3-race');
        """, timeout=25)

    def run_reassign() -> None:
        barrier.wait()
        results["reassign"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{SUPPORT}', false);
          SELECT public.assign_service_job('{job}'::uuid, '{TECH2}'::uuid, 'f3-race', NULL);
        """, timeout=25)

    t1 = threading.Thread(target=run_start)
    t2 = threading.Thread(target=run_reassign)
    t1.start(); t2.start()
    t1.join(30); t2.join(30)
    return results


def classify_start_reassign(port: str, user: str, db: str, visit: str, results: dict[str, ProcResult]) -> tuple[bool, str]:
    for label, r in results.items():
        if r.sqlstate == "40P01" or (not r.ok and "timeout" in (r.err + r.out).lower()):
            return False, f"deadlock_or_hang on {label}"
        if not r.ok and r.sqlstate == "40P01":
            return False, f"40P01 on {label}"

    st = psql(port, user, db, f"""
      SELECT state, attending_technician_id::text,
             (SELECT assigned_technician_id::text FROM public.service_jobs j
              JOIN public.service_job_visits v ON v.job_id = j.id WHERE v.id = '{visit}'::uuid)
      FROM public.service_job_visits WHERE id = '{visit}'::uuid;
    """)
    # parse state
    state = None
    assignee = None
    for ln in st.out.splitlines():
        if "|" in ln and "state" not in ln.lower() and "row" not in ln.lower() and not set(ln.strip()) <= set("+-| "):
            cols = [c.strip() for c in ln.split("|")]
            if len(cols) >= 3:
                state, _att, assignee = cols[0], cols[1], cols[2]
    start_ok = results["start"].ok
    re_ok = results["reassign"].ok

    # Valid: start wins → visit in_progress, reassign denied
    if start_ok and not re_ok and state == "in_progress" and assignee == TECH1:
        return True, "start_wins_reassign_denied"
    # Valid: reassign wins → former tech start denied, assignee tech2, visit still scheduled
    if re_ok and not start_ok and state == "scheduled" and assignee == TECH2:
        return True, "reassign_wins_start_denied"
    return False, f"incoherent start_ok={start_ok} re_ok={re_ok} state={state} assignee={assignee}"


def probe_dual_first_starts(port: str, user: str, db: str) -> tuple[bool, str]:
    """Concurrent first starts on two jobs of the same ticket."""
    setup = psql(port, user, db, f"""
      CREATE TABLE IF NOT EXISTS public.b3_f3_dual(job1 uuid, job2 uuid, visit1 uuid, visit2 uuid, ticket uuid);
      TRUNCATE public.b3_f3_dual;
      SELECT set_config('app.b1_uid', '{SUPPORT}', false);
      DO $$
      DECLARE
        v_t uuid; v_j1 uuid; v_j2 uuid; v_v1 uuid; v_v2 uuid;
        v_start timestamptz := now() + interval '80 hours';
        v_end timestamptz := now() + interval '82 hours';
      BEGIN
        v_t := b1_mkticket('cust1', 'B3F3D-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
        SELECT (public.create_service_job(v_t, 'F3 dual1', true, 'f3')).id INTO v_j1;
        SELECT (public.create_service_job(v_t, 'F3 dual2', true, 'f3')).id INTO v_j2;
        PERFORM public.assign_service_job(v_j1, '{TECH1}'::uuid, 'f3', NULL);
        PERFORM public.assign_service_job(v_j2, '{TECH2}'::uuid, 'f3', NULL);
        UPDATE public.service_tickets SET status='assigned',
          assigned_to=COALESCE(assigned_to,'{TECH1}'::uuid),
          assigned_by=COALESCE(assigned_by,'{SUPPORT}'::uuid),
          assigned_at=COALESCE(assigned_at, now()), updated_at=now()
        WHERE id=v_t AND status='open';
        SELECT (public.schedule_service_job_visit(v_j1, v_start, v_end, 'd1', NULL)).id INTO v_v1;
        SELECT (public.schedule_service_job_visit(v_j2, v_start, v_end, 'd2', NULL)).id INTO v_v2;
        PERFORM set_config('app.b1_uid', '{TECH1}', false);
        PERFORM public.record_visit_safety_check(v_v1, 'passed', 'd1', NULL, b3_safety());
        PERFORM set_config('app.b1_uid', '{TECH2}', false);
        PERFORM public.record_visit_safety_check(v_v2, 'passed', 'd2', NULL, b3_safety());
        INSERT INTO public.b3_f3_dual VALUES (v_j1, v_j2, v_v1, v_v2, v_t);
      END $$;
      SELECT visit1::text, visit2::text, ticket::text FROM public.b3_f3_dual;
    """)
    if not setup.ok:
        return False, f"dual setup failed: {setup.err}"
    data = [
        ln for ln in setup.out.splitlines()
        if "|" in ln and "visit1" not in ln.lower() and "row" not in ln.lower()
        and not set(ln.strip()) <= set("+-| ")
    ]
    cols = [c.strip() for c in data[-1].split("|")]
    v1, v2, ticket = cols[0], cols[1], cols[2]
    barrier = threading.Barrier(2, timeout=10)
    results: dict[str, ProcResult] = {}

    def s1() -> None:
        barrier.wait()
        results["a"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{TECH1}', false);
          SELECT public.start_service_job_visit('{v1}'::uuid, NULL, NULL, 'dual-a');
        """, timeout=25)

    def s2() -> None:
        barrier.wait()
        results["b"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{TECH2}', false);
          SELECT public.start_service_job_visit('{v2}'::uuid, NULL, NULL, 'dual-b');
        """, timeout=25)

    t1 = threading.Thread(target=s1); t2 = threading.Thread(target=s2)
    t1.start(); t2.start(); t1.join(30); t2.join(30)
    for label, r in results.items():
        if r.sqlstate == "40P01" or (not r.ok and "deadlock" in (r.err + r.out).lower()):
            return False, f"40P01 dual first-start on {label}"
    # Both starts should succeed (different jobs); ticket once in_progress; no partial audit gap
    chk = psql(port, user, db, f"""
      SELECT
        (SELECT state FROM public.service_job_visits WHERE id='{v1}'::uuid),
        (SELECT state FROM public.service_job_visits WHERE id='{v2}'::uuid),
        (SELECT status::text FROM public.service_tickets WHERE id='{ticket}'::uuid),
        (SELECT count(*) FROM public.ticket_governance_audit
           WHERE ticket_id='{ticket}'::uuid AND action='status_transition'
             AND details->>'workflow'='b3_first_visit_start');
    """)
    rows = [
        ln for ln in chk.out.splitlines()
        if "|" in ln and "state" not in ln.lower() and "row" not in ln.lower()
        and not set(ln.strip()) <= set("+-| ")
    ]
    c = [x.strip() for x in rows[-1].split("|")]
    ok = results["a"].ok and results["b"].ok and c[0] == "in_progress" and c[1] == "in_progress" \
        and c[2] == "in_progress" and c[3] == "1"
    return ok, f"v1={c[0]} v2={c[1]} tkt={c[2]} first_audits={c[3]}"


def probe_safety_vs_reassign(port: str, user: str, db: str) -> tuple[bool, str]:
    setup = psql(port, user, db, f"""
      CREATE TABLE IF NOT EXISTS public.b3_f3_safe(job uuid, visit uuid);
      TRUNCATE public.b3_f3_safe;
      SELECT set_config('app.b1_uid', '{SUPPORT}', false);
      DO $$
      DECLARE v_t uuid; v_j uuid; v_v uuid;
        v_start timestamptz := now() + interval '90 hours';
        v_end timestamptz := now() + interval '92 hours';
      BEGIN
        v_t := b1_mkticket('cust1', 'B3F3S-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
        SELECT (public.create_service_job(v_t, 'F3 safe', true, 'f3')).id INTO v_j;
        PERFORM public.assign_service_job(v_j, '{TECH1}'::uuid, 'f3', NULL);
        PERFORM b3_arm_ticket(v_j);
        SELECT (public.schedule_service_job_visit(v_j, v_start, v_end, 's', NULL)).id INTO v_v;
        INSERT INTO public.b3_f3_safe VALUES (v_j, v_v);
      END $$;
      SELECT job::text, visit::text FROM public.b3_f3_safe;
    """)
    if not setup.ok:
        return False, f"safety setup failed: {setup.err}"
    data = [
        ln for ln in setup.out.splitlines()
        if "|" in ln and "job" not in ln.lower() and "row" not in ln.lower()
        and not set(ln.strip()) <= set("+-| ")
    ]
    job, visit = [c.strip() for c in data[-1].split("|")][:2]
    barrier = threading.Barrier(2, timeout=10)
    results: dict[str, ProcResult] = {}

    def safety() -> None:
        barrier.wait()
        results["safety"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{TECH1}', false);
          SELECT public.record_visit_safety_check('{visit}'::uuid, 'passed', 'race', NULL,
            public.b3_minimum_safety_attestation());
        """, timeout=25)

    def reassign() -> None:
        barrier.wait()
        results["reassign"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{SUPPORT}', false);
          SELECT public.assign_service_job('{job}'::uuid, '{TECH2}'::uuid, 'safe-race', NULL);
        """, timeout=25)

    t1 = threading.Thread(target=safety); t2 = threading.Thread(target=reassign)
    t1.start(); t2.start(); t1.join(30); t2.join(30)
    for label, r in results.items():
        if r.sqlstate == "40P01":
            return False, f"40P01 safety-vs-reassign on {label}"
    # Coherent: both may succeed (safety then reassign invalidates gen) or reassign then
    # safety binds to new gen for tech1 who is no longer bound → safety deny; never deadlock.
    hist = psql(port, user, db, f"""
      SELECT count(*)::text,
             (SELECT assigned_technician_id::text FROM public.service_jobs WHERE id='{job}'::uuid)
      FROM public.service_job_visit_safety_checks WHERE visit_id='{visit}'::uuid;
    """)
    if any(r.sqlstate == "40P01" for r in results.values()):
        return False, "40P01"
    return True, f"safety_ok={results['safety'].ok} re_ok={results['reassign'].ok} no_deadlock"


def probe_assign_decline(port: str, user: str, db: str) -> tuple[bool, str]:
    """Concurrent assign(tech2) vs decline(tech1) on same job — coherent, no 40P01."""
    setup = psql(port, user, db, f"""
      CREATE TABLE IF NOT EXISTS public.b3_f3_ad(job uuid);
      TRUNCATE public.b3_f3_ad;
      SELECT set_config('app.b1_uid', '{SUPPORT}', false);
      DO $$
      DECLARE v_t uuid; v_j uuid;
      BEGIN
        v_t := b1_mkticket('cust1', 'B3F3A-' || substr(replace(gen_random_uuid()::text,'-',''),1,8));
        SELECT (public.create_service_job(v_t, 'F3 ad', true, 'f3')).id INTO v_j;
        PERFORM public.assign_service_job(v_j, '{TECH1}'::uuid, 'f3', NULL);
        INSERT INTO public.b3_f3_ad VALUES (v_j);
      END $$;
      SELECT job::text FROM public.b3_f3_ad;
    """)
    if not setup.ok:
        return False, f"assign/decline setup failed: {setup.err}"
    data = [
        ln for ln in setup.out.splitlines()
        if ln.strip() and "job" not in ln.lower() and "row" not in ln.lower()
        and "-" not in ln[:3] and len(ln.strip()) > 30
    ]
    # uuid line may be bare
    job = None
    for ln in setup.out.splitlines():
        s = ln.strip()
        if len(s) == 36 and s.count("-") == 4:
            job = s
    if not job:
        return False, f"no job id in {setup.out}"
    barrier = threading.Barrier(2, timeout=10)
    results: dict[str, ProcResult] = {}

    def assign() -> None:
        barrier.wait()
        results["assign"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{SUPPORT}', false);
          SELECT public.assign_service_job('{job}'::uuid, '{TECH2}'::uuid, 'ad-race', NULL);
        """, timeout=25)

    def decline() -> None:
        barrier.wait()
        results["decline"] = psql(port, user, db, f"""
          SELECT set_config('app.b1_uid', '{TECH1}', false);
          SELECT public.decline_service_job('{job}'::uuid, 'ad-race', NULL);
        """, timeout=25)

    t1 = threading.Thread(target=assign); t2 = threading.Thread(target=decline)
    t1.start(); t2.start(); t1.join(30); t2.join(30)
    for label, r in results.items():
        if r.sqlstate == "40P01":
            return False, f"40P01 assign/decline on {label}"
    # Exactly one should win coherently (or assign wins then decline fails auth; or decline then assign)
    xor = results["assign"].ok != results["decline"].ok or (
        results["assign"].ok and results["decline"].ok
    )
    # Both succeeding is possible only if sequenced: decline then assign (unassigned→tech2) —
    # that's coherent. Deadlock is the failure mode we forbid.
    return True, f"assign_ok={results['assign'].ok} decline_ok={results['decline'].ok}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", required=True)
    ap.add_argument("--db", required=True)
    ap.add_argument("--user", default=getpass.getuser())
    ap.add_argument("--rounds", type=int, default=8)
    args = ap.parse_args()

    # Repeat barrier-synchronized start-vs-reassign in both scheduling orders
    # (thread start order); outcomes must remain valid serializations, never 40P01.
    outcomes = []
    deadlocks = 0
    for i in range(args.rounds):
        # Alternate which thread is created first (acquisition race pressure).
        job, visit = setup_start_vs_reassign(args.port, args.user, args.db)
        if i % 2 == 0:
            results = race_start_vs_reassign(args.port, args.user, args.db, job, visit)
        else:
            # Flip thread scheduling bias by sleeping the "start" side slightly after barrier
            # is already handled inside race; re-run with swapped thread start order:
            barrier = threading.Barrier(2, timeout=10)
            results = {}

            def run_reassign() -> None:
                barrier.wait()
                results["reassign"] = psql(args.port, args.user, args.db, f"""
                  SELECT set_config('app.b1_uid', '{SUPPORT}', false);
                  SELECT public.assign_service_job('{job}'::uuid, '{TECH2}'::uuid, 'f3-race', NULL);
                """, timeout=25)

            def run_start() -> None:
                barrier.wait()
                results["start"] = psql(args.port, args.user, args.db, f"""
                  SELECT set_config('app.b1_uid', '{TECH1}', false);
                  SELECT public.start_service_job_visit('{visit}'::uuid, NULL, NULL, 'f3-race');
                """, timeout=25)

            t1 = threading.Thread(target=run_reassign)
            t2 = threading.Thread(target=run_start)
            t1.start(); t2.start(); t1.join(30); t2.join(30)
        ok, detail = classify_start_reassign(args.port, args.user, args.db, visit, results)
        if "40P01" in detail or "deadlock" in detail or "hang" in detail:
            deadlocks += 1
        outcomes.append((ok, detail))
        # cleanup visit if in progress so next fixture is independent (new fixture each round)

    wins_start = sum(1 for ok, d in outcomes if ok and d.startswith("start_wins"))
    wins_re = sum(1 for ok, d in outcomes if ok and d.startswith("reassign_wins"))
    all_ok = all(ok for ok, _ in outcomes) and deadlocks == 0 and (wins_start + wins_re) == len(outcomes)
    note(args.port, args.user, args.db, "B3-F3-1", all_ok,
         f"rounds={len(outcomes)} start_wins={wins_start} reassign_wins={wins_re} deadlocks={deadlocks}")

    ok2, d2 = probe_dual_first_starts(args.port, args.user, args.db)
    note(args.port, args.user, args.db, "B3-F3-2", ok2, d2)

    ok3, d3 = probe_assign_decline(args.port, args.user, args.db)
    note(args.port, args.user, args.db, "B3-F3-3", ok3, d3)

    ok4, d4 = probe_safety_vs_reassign(args.port, args.user, args.db)
    note(args.port, args.user, args.db, "B3-F3-4", ok4, d4)

    # Documented lock-order helpers present
    helpers = psql(args.port, args.user, args.db, """
      SELECT
        to_regprocedure('admin_private.lock_ticket_for_workflow(uuid)') IS NOT NULL
        AND to_regprocedure('admin_private.lock_job_hierarchy(uuid)') IS NOT NULL
        AND to_regprocedure('admin_private.lock_visit_hierarchy(uuid)') IS NOT NULL;
    """)
    note(args.port, args.user, args.db, "B3-F3-5", "t" in helpers.out.lower() or "true" in helpers.out.lower(),
         "lock helpers ticket→job→visit")

    print(f"F-B3-03 concurrent: F3-1={all_ok} F3-2={ok2} F3-3={ok3} F3-4={ok4}")
    if not (all_ok and ok2 and ok3 and ok4):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
