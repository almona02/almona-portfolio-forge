"""Spark independent Lane B concurrency battery (LB-C1 + RB-13, separate).

Implementation: d0c311c9 | Manifest tip: 8685aa55 | Contract: da4bcb4a.
Barrier-started workers on separate connections; post-join invariant asserts.
"""
import json
import sys
import threading
import time

import psycopg2

DSN = "host=127.0.0.1 port=55461 dbname=laneb user=postgres"
ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
TECH = "cccccccc-cccc-cccc-cccc-ccccccccccc1"
RESULTS = []


def one(sql, args=(), uid=None):
    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    cur = conn.cursor()
    if uid:
        cur.execute("SET LOCAL ROLE authenticated")
        cur.execute("SET LOCAL app.b1_uid = %s", (uid,))
    cur.execute(sql, args)
    try:
        row = cur.fetchone()
    except psycopg2.ProgrammingError:
        row = None
    conn.commit()
    conn.close()
    return row[0] if row else None


def job(title):
    return str(one("SELECT id FROM public.service_jobs WHERE title=%s", (title,)))


def ver(code, ordinal):
    return str(
        one(
            """SELECT v.id FROM public.service_routine_versions v
               JOIN public.service_routines r ON r.id = v.routine_id
               WHERE r.code=%s AND v.version_ordinal=%s""",
            (code, ordinal),
        )
    )


def active_pins(job_id):
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        "SELECT id, routine_version_id FROM public.service_job_routine_pins"
        " WHERE job_id=%s AND status='active'",
        (job_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def history_len(job_id):
    conn = psycopg2.connect(DSN)
    cur = conn.cursor()
    cur.execute(
        "SELECT count(*) FROM public.service_job_routine_pins WHERE job_id=%s",
        (job_id,),
    )
    n = cur.fetchone()[0]
    conn.close()
    return n


def err_detail(e):
    try:
        return e.diag.message_detail or ""
    except Exception:
        return ""


def worker(barrier, uid, sql, args, out, idx, owner=False):
    conn = psycopg2.connect(DSN)
    conn.autocommit = False
    try:
        cur = conn.cursor()
        cur.execute("SET statement_timeout='60s'")
        if not owner:
            cur.execute("SET LOCAL ROLE authenticated")
            cur.execute("SET LOCAL app.b1_uid = %s", (uid,))
        barrier.wait(timeout=120)
        t0 = time.time()
        try:
            cur.execute(sql, args)
            try:
                row = cur.fetchone()
            except psycopg2.ProgrammingError:
                row = None
            conn.commit()
            out[idx] = ("ok", row[0] if row else None, round(time.time() - t0, 3))
        except psycopg2.Error as e:
            conn.rollback()
            out[idx] = (
                "err",
                (e.pgcode, err_detail(e), str(e).split("\n")[0][:160]),
                round(time.time() - t0, 3),
            )
    except threading.BrokenBarrierError:
        out[idx] = ("err", ("HARNESS", "barrier broken", ""), -1.0)
    finally:
        conn.close()


def run_group(sqls, barrier_size=None):
    """sqls: list of (uid, sql, args, owner). Returns outcome list."""
    n = len(sqls)
    barrier = threading.Barrier(n if barrier_size is None else barrier_size)
    out = [None] * n
    threads = [
        threading.Thread(
            target=worker, args=(barrier, uid, sql, args, out, i, owner)
        )
        for i, (uid, sql, args, owner) in enumerate(sqls)
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=180)
    assert all(o is not None for o in out), f"worker hung: {out}"
    assert all(not t.is_alive() for t in threads), "thread join timeout"
    return out


def check(cid, name, fn):
    try:
        detail = fn()
        RESULTS.append({"id": cid, "name": name, "pass": True, "detail": detail})
        print(f"PASS {cid} {name} :: {detail}")
    except AssertionError as e:
        RESULTS.append({"id": cid, "name": name, "pass": False, "detail": str(e)})
        print(f"FAIL {cid} {name} :: {e}")
    except Exception as e:  # noqa: BLE001
        RESULTS.append({"id": cid, "name": name, "pass": False, "detail": f"HARNESS: {e!r}"})
        print(f"FAIL {cid} {name} :: HARNESS {e!r}")


def main():
    # Rerun-safety for jobs this battery creates itself.
    one("DELETE FROM public.service_job_visits WHERE job_id IN "
        "(SELECT id FROM public.service_jobs WHERE title='SPARK-J-C2E' OR title LIKE 'SPARK-C3B-%%')")
    one("DELETE FROM public.service_jobs WHERE title='SPARK-J-C2E' OR title LIKE 'SPARK-C3B-%%'")
    J_C1 = job("SPARK-J-C1")
    J_C4 = job("SPARK-J-C4")
    K1, K2, K3, K4 = (ver("LB-SPARK-R7", i) for i in (1, 2, 3, 4))
    N9 = ver("LB-SPARK-R8", 1)
    M1 = ver("LB-SPARK-R9", 1)
    S1, S2 = ver("LB-SPARK-R10", 1), ver("LB-SPARK-R10", 2)
    C2JOBS = [job(f"SPARK-J-C2{c}") for c in "ABCD"]

    def c1():
        one(
            "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_C1, K1, "c1 setup"),
            uid=ADMIN,
        )
        out = run_group(
            [
                (ADMIN, "SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)",
                 (J_C1, tgt, f"to k{i}"), False)
                for i, tgt in enumerate((K2, K3, K4), start=2)
            ]
        )
        oks = [o for o in out if o[0] == "ok"]
        errs = [o for o in out if o[0] == "err"]
        for o in errs:
            assert o[1][0] == "22023", f"non-explicit error: {o}"
        act = active_pins(J_C1)
        assert len(act) == 1, f"expected exactly one active: {act}"
        assert history_len(J_C1) == 1 + len(oks), (history_len(J_C1), out)
        maxt = max(o[2] for o in out)
        return f"{len(oks)}/3 ok, one active {act[0][1]}, max {maxt}s"

    def c2():
        out = run_group(
            [
                (ADMIN, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                 (jid, N9, f"c2 pin {c}"), False)
                for c, jid in zip("ABCD", C2JOBS)
            ]
            + [
                (ADMIN, "SELECT public.retire_service_routine_version(%s,NULL)",
                 (N9,), False)
            ]
        )
        *pin_out, retire_out = out
        assert retire_out[0] == "ok", f"retire failed: {retire_out}"
        for o in pin_out:
            if o[0] == "err":
                assert o[1][0] == "22023", o
                assert o[1][1] == "routine_pin_version_retired", o
        # Every committed pin stays readable post-retire.
        for jid, o in zip(C2JOBS, pin_out):
            if o[0] == "ok":
                g = one(
                    "SELECT public.get_service_job_routine_pin(%s,NULL)", (jid,),
                    uid=ADMIN,
                )
                assert g["active"] is not None, (jid, g)
                assert g["active"]["version_status"] == "retired", (jid, g)
        n_ok = sum(1 for o in pin_out if o[0] == "ok")
        return f"retire ok; {n_ok}/4 pins landed pre-retire, all readable"

    def c3():
        dist = {"ok": 0, "denied": 0}
        worst = 0.0
        for n in range(1, 21):
            jid = job(f"SPARK-C3-{n:02d}")
            out = run_group(
                [
                    (ADMIN, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                     (jid, M1, f"c3 round {n}"), False),
                    (None,
                     "INSERT INTO public.service_job_visits (job_id, state)"
                     " VALUES (%s,'in_progress')",
                     (jid,), True),
                ]
            )
            pin_o, start_o = out
            assert start_o[0] == "ok", f"round {n} start failed: {start_o}"
            if pin_o[0] == "ok":
                dist["ok"] += 1
                assert len(active_pins(jid)) == 1, f"round {n}: pin ok but no active"
            else:
                assert pin_o[1][0] == "22023", f"round {n}: {pin_o}"
                assert pin_o[1][1] == "routine_pin_locked_after_start", f"round {n}: {pin_o}"
                assert active_pins(jid) == [], f"round {n}: denied but pin present"
                dist["denied"] += 1
            b = one(
                "SELECT work_started_boundary_at FROM public.service_jobs WHERE id=%s",
                (jid,),
            )
            assert b is not None, f"round {n}: boundary missing"
            worst = max(worst, pin_o[2], start_o[2])
        return f"20 rounds valid (pinned {dist['ok']}, denied {dist['denied']}), worst {worst}s"

    def c4():
        one(
            "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_C4, S1, "c4 setup"),
            uid=ADMIN,
        )
        out = run_group(
            [
                (ADMIN, "SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)",
                 (J_C4, S2, f"c4 w{i}"), False)
                for i in range(6)
            ]
        )
        for o in out:
            if o[0] == "err":
                assert o[1][0] == "22023", f"non-explicit error: {o}"
                assert o[1][0] != "23505", f"cardinality violated: {o}"
        oks = [o for o in out if o[0] == "ok"]
        act = active_pins(J_C4)
        assert len(act) == 1 and str(act[0][1]) == S2, act
        assert history_len(J_C4) == 1 + len(oks), (history_len(J_C4), out)
        return f"{len(oks)}/6 ok, one active S2"

    def c2b():
        # Reverse-order race: retire delayed so pins land first, then retire.
        # R8/N9 already retired by C-2; use R5/P2 (published by S-08) on a fresh job.
        jid = str(one(
            """INSERT INTO public.service_jobs (ticket_id, title, state, assigned_technician_id)
               SELECT t.id, 'SPARK-J-C2E', 'planned', %s FROM public.service_tickets t
               WHERE t.title='SPARK-T-CONC' RETURNING id""",
            (TECH,),
        ))
        one(
            """INSERT INTO public.service_routine_versions
                 (routine_id, version_ordinal, status, draft_revision, author_id)
               SELECT r.id, 2, 'published', 'p2', %s
               FROM public.service_routines r WHERE r.code = 'LB-SPARK-R5'
               AND NOT EXISTS (
                 SELECT 1 FROM public.service_routine_versions v
                 WHERE v.routine_id = r.id AND v.version_ordinal = 2)""",
            (ADMIN,),
        )
        p2 = ver("LB-SPARK-R5", 2)
        out = run_group(
            [
                (ADMIN, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                 (jid, p2, "c2b pin"), False),
                (ADMIN, "SELECT pg_sleep(0.3), public.retire_service_routine_version(%s,NULL)",
                 (p2,), False),
            ]
        )
        pin_o, ret_o = out
        assert pin_o[0] == "ok", f"pin should land first: {pin_o}"
        assert ret_o[0] == "ok", f"retire failed: {ret_o}"
        g = one(
            "SELECT public.get_service_job_routine_pin(%s,NULL)", (jid,),
            uid=ADMIN,
        )
        assert g["active"] is not None and g["active"]["version_status"] == "retired", g
        return "pin landed pre-retire, readable post-retire"

    def c3b():
        # Reverse-order race: starts delayed 50ms so pins win; validity both ways.
        dist = {"ok": 0, "denied": 0}
        for n in (3, 7, 11, 15, 19):
            # Fresh job per round on T-CONC (C-3 already used the C3 jobs).
            jid = one(
                """INSERT INTO public.service_jobs (ticket_id, title, state, assigned_technician_id)
                   SELECT t.id, %s, 'planned', %s FROM public.service_tickets t
                   WHERE t.title='SPARK-T-CONC' RETURNING id""",
                (f"SPARK-C3B-{n:02d}", TECH),
            )
            jid = str(jid)
            out = run_group(
                [
                    (ADMIN, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                     (jid, M1, f"c3b round {n}"), False),
                    (None, "SELECT pg_sleep(0.05); INSERT INTO public.service_job_visits"
                     " (job_id, state) VALUES (%s,'in_progress')",
                     (jid,), True),
                ]
            )
            pin_o, start_o = out
            assert start_o[0] == "ok", f"round {n} start failed: {start_o}"
            if pin_o[0] == "ok":
                dist["ok"] += 1
                assert len(active_pins(jid)) == 1, f"round {n}"
            else:
                assert pin_o[1][1] == "routine_pin_locked_after_start", f"round {n}: {pin_o}"
                dist["denied"] += 1
        return f"delayed-start rounds valid (pinned {dist['ok']}, denied {dist['denied']})"

    check("C-1", "LB-C1 concurrent replaces distinct targets", c1)
    check("C-2", "RB-13a concurrent pin vs retire", c2)
    check("C-2b", "RB-13a reverse order pin-then-retire", c2b)
    check("C-3", "RB-13b concurrent pin vs start (20 rounds)", c3)
    check("C-3b", "RB-13b delayed-start rounds", c3b)
    check("C-4", "LB-C1 concurrent replaces same target", c4)


if __name__ == "__main__":
    main()
    n_pass = sum(1 for r in RESULTS if r["pass"])
    with open("spark_lane_b_concurrency_results.json", "w", encoding="utf-8") as f:
        json.dump(
            {
                "implementation": "d0c311c9cfc9a65bf67f85ee95b14946224d0a7b",
                "manifest_tip": "8685aa5510ce4ee804f1463511d619f9f41244b3",
                "contract": "da4bcb4a",
                "results": RESULTS,
            },
            f,
            indent=2,
        )
    print(f"CONCURRENCY {n_pass}/{len(RESULTS)}")
    sys.exit(0 if n_pass == len(RESULTS) else 1)
