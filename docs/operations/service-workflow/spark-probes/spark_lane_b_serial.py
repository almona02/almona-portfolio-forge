"""Spark independent Lane B serial battery (disposable PG17).

Implementation: d0c311c9 | Manifest tip: 8685aa55 | Contract: da4bcb4a.
Every deny asserts exact (SQLSTATE, DETAIL); every success asserts exact row +
audit state. Prints TAP-ish lines and writes JSON next to this file.
"""
import json
import sys

import psycopg2

DSN = "host=127.0.0.1 port=55461 dbname=laneb user=postgres"
ADMIN = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1"
SUPPORT = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
TECH = "cccccccc-cccc-cccc-cccc-ccccccccccc1"
TECH2 = "cccccccc-cccc-cccc-cccc-ccccccccccc2"
CUSTOMER = "dddddddd-dddd-dddd-dddd-ddddddddddd1"
SALES = "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1"

RESULTS = []


def connect():
    c = psycopg2.connect(DSN)
    c.autocommit = False
    return c


def ident(cur, uid):
    cur.execute("SET LOCAL ROLE authenticated")
    cur.execute("SET LOCAL app.b1_uid = %s", (uid,))


def attempt(cur, sql, args):
    """Returns ('ok', value) or ('err', (sqlstate, detail, message))."""
    try:
        cur.execute(sql, args)
        row = cur.fetchone()
        return ("ok", row[0] if row else None)
    except psycopg2.Error as e:
        detail = ""
        try:
            detail = e.diag.message_detail or ""
        except Exception:
            pass
        return ("err", (e.pgcode, detail, str(e).split("\n")[0]))


def check(cid, name, fn):
    try:
        detail = fn()
        RESULTS.append({"id": cid, "name": name, "pass": True, "detail": detail})
        print(f"PASS {cid} {name} :: {detail}")
    except AssertionError as e:
        RESULTS.append({"id": cid, "name": name, "pass": False, "detail": str(e)})
        print(f"FAIL {cid} {name} :: {e}")
    except Exception as e:  # noqa: BLE001 - harness must record, not crash
        RESULTS.append({"id": cid, "name": name, "pass": False, "detail": f"HARNESS: {e!r}"})
        print(f"FAIL {cid} {name} :: HARNESS {e!r}")


# ---------------------------------------------------------------- lookups
def job(title):
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT id FROM public.service_jobs WHERE title = %s", (title,))
    jid = cur.fetchone()[0]
    conn.close()
    return str(jid)


def ver(code, ordinal):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        """SELECT v.id FROM public.service_routine_versions v
           JOIN public.service_routines r ON r.id = v.routine_id
           WHERE r.code = %s AND v.version_ordinal = %s""",
        (code, ordinal),
    )
    vid = cur.fetchone()[0]
    conn.close()
    return str(vid)


def ver_by_status(code, status):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        """SELECT v.id FROM public.service_routine_versions v
           JOIN public.service_routines r ON r.id = v.routine_id
           WHERE r.code = %s AND v.status = %s""",
        (code, status),
    )
    vid = cur.fetchone()[0]
    conn.close()
    return str(vid)


def pin_rows(job_id):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        """SELECT id, routine_version_id, status, reason, pinned_by,
                  replaced_by_pin_id, unpinned_by, unpinned_at
           FROM public.service_job_routine_pins WHERE job_id = %s
           ORDER BY pinned_at, created_at""",
        (job_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def audits_for(entity_id):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        """SELECT action, from_state, to_state, rationale, actor_role
           FROM public.service_workflow_audit
           WHERE entity_type = 'service_job_routine_pin' AND entity_id = %s
           ORDER BY created_at""",
        (entity_id,),
    )
    rows = cur.fetchall()
    conn.close()
    return rows


def audit_count():
    conn = connect()
    cur = conn.cursor()
    cur.execute("SELECT count(*) FROM public.service_workflow_audit")
    n = cur.fetchone()[0]
    conn.close()
    return n


def boundary(job_id):
    conn = connect()
    cur = conn.cursor()
    cur.execute(
        "SELECT work_started_boundary_at FROM public.service_jobs WHERE id = %s",
        (job_id,),
    )
    b = cur.fetchone()[0]
    conn.close()
    return b


# --------------------------------------------------------------- checks
def main():
    J_MAIN = job("SPARK-J-MAIN")
    J_SUP = job("SPARK-J-SUP")
    J_NOREASON = job("SPARK-J-NOREASON")
    J_DRAFT = job("SPARK-J-DRAFT")
    J_INREVIEW = job("SPARK-J-INREVIEW")
    J_RETIRED = job("SPARK-J-RETIRED")
    J_MM = job("SPARK-J-MM")
    J_NOMACH = job("SPARK-J-NOMACH")
    J_UC = job("SPARK-J-UC")
    J_UN = job("SPARK-J-UN")
    J_R7 = job("SPARK-J-R7")
    J_R12 = job("SPARK-J-R12")
    J_R19 = job("SPARK-J-R19")
    J_R18 = job("SPARK-J-R18")
    J_R18B = job("SPARK-J-R18B")
    J_TECH = job("SPARK-J-TECH")
    J_CUST = job("SPARK-J-CUST")
    V1 = ver("LB-SPARK-R1", 1)
    V2 = ver("LB-SPARK-R1", 2)
    V3D = ver_by_status("LB-SPARK-R1", "draft")
    W1 = ver("LB-SPARK-R2", 1)
    W2R = ver_by_status("LB-SPARK-R2", "in_review")
    X1 = ver("LB-SPARK-R3", 1)
    Y1 = ver("LB-SPARK-R4", 1)
    P1 = ver("LB-SPARK-R5", 1)
    Z1 = ver("LB-SPARK-R6", 1)

    def s01():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_MAIN, V1, "initial pin"),
        )
        assert st == "ok", f"expected ok got {val}"
        assert val["status"] == "active" and val["routine_version_id"] == V1, val
        conn.commit()
        rows = pin_rows(J_MAIN)
        assert len(rows) == 1 and rows[0][2] == "active", rows
        assert str(rows[0][1]) == V1 and rows[0][3] == "initial pin", rows
        assert str(rows[0][4]) == ADMIN, rows
        auds = audits_for(str(rows[0][0]))
        assert len(auds) == 1, auds
        assert auds[0][0] == "routine_job_pinned" and auds[0][2] == "active", auds
        assert auds[0][3] == "initial pin" and auds[0][4] == "admin", auds
        conn.close()
        return "active pin + routine_job_pinned audit"

    def s02():
        conn = connect()
        cur = conn.cursor()
        ident(cur, SUPPORT)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_SUP, W1, "support pin"),
        )
        assert st == "ok", f"expected ok got {val}"
        conn.commit()
        conn.close()
        rows = pin_rows(J_SUP)
        assert len(rows) == 1 and rows[0][2] == "active" and str(rows[0][4]) == SUPPORT, rows
        return "support pin ok"

    def s03():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_NOREASON, V1, None),
        )
        conn.rollback()
        assert st == "err" and val[0] == "22023", val
        assert val[1] == "routine_pin_reason_required", val
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_NOREASON, V1, "   "),
        )
        conn.rollback()
        assert st == "err" and val[1] == "routine_pin_reason_required", val
        conn.close()
        assert pin_rows(J_NOREASON) == [], "no rows on deny"
        return "null + blank reason denied, no rows"

    def s04():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_DRAFT, V3D, "r"),
        )
        conn.rollback()
        assert st == "err" and val[0] == "22023", val
        assert val[1] == "routine_pin_version_not_published", val
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_INREVIEW, W2R, "r"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[1] == "routine_pin_version_not_published", val
        assert pin_rows(J_DRAFT) == [] and pin_rows(J_INREVIEW) == []
        return "draft + in_review denied"

    def s05():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.retire_service_routine_version(%s,NULL)", (Y1,)
        )
        assert st == "ok", f"retire rpc failed: {val}"
        conn.commit()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_RETIRED, Y1, "r"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[0] == "22023", val
        assert val[1] == "routine_pin_version_retired", val
        assert pin_rows(J_RETIRED) == []
        return "retired version denied"

    def s06():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_MM, V1, "r"),
        )
        conn.rollback()
        assert st == "err" and val[1] == "routine_pin_applicability_denied", val
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_MM, X1, "zz pin"),
        )
        assert st == "ok", f"positive control failed: {val}"
        conn.commit()
        conn.close()
        rows = pin_rows(J_MM)
        assert len(rows) == 1 and str(rows[0][1]) == X1, rows
        return "mismatch denied; R3-on-ZZ9 positive control ok"

    def s07():
        cases = [
            (J_NOMACH, "routine_pin_machine_unlinked"),
            (J_UC, "routine_pin_machine_uncatalogued"),
            (J_UN, "routine_pin_machine_uncatalogued"),
        ]
        for jid, detail in cases:
            conn = connect()
            cur = conn.cursor()
            ident(cur, ADMIN)
            st, val = attempt(
                cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                (jid, V1, "r"),
            )
            conn.rollback()
            conn.close()
            assert st == "err" and val[0] == "22023", (jid, val)
            assert val[1] == detail, (jid, val)
            assert pin_rows(jid) == [], jid
        return "unlinked + uncatalogued + uncertain denied"

    def s08():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_R7, P1, "pin v1"),
        )
        assert st == "ok", f"expected ok got {val}"
        conn.commit()
        conn.close()
        # Later publish of V2 (simulated Lane A outcome): pin must stay V1.
        conn = connect()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO public.service_routine_versions
                 (routine_id, version_ordinal, status, draft_revision, author_id)
               SELECT r.id, 2, 'published', 'p2', %s
               FROM public.service_routines r WHERE r.code = 'LB-SPARK-R5'""",
            (ADMIN,),
        )
        conn.commit()
        conn.close()
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_R7,)
        )
        conn.rollback()
        conn.close()
        assert st == "ok", val
        assert val["active"]["version_ordinal"] == 1, val
        assert val["active"]["routine_version_id"] == P1, val
        return "pin stays V1 after V2 publish"

    def s09():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)",
            (J_MAIN, V2, "upgrade to v2"),
        )
        assert st == "ok", f"expected ok got {val}"
        assert val["routine_version_id"] == V2, val
        conn.commit()
        conn.close()
        rows = pin_rows(J_MAIN)
        assert len(rows) == 2, rows
        old, new = rows
        assert old[2] == "replaced" and str(old[1]) == V1, rows
        assert str(old[5]) == str(new[0]), rows
        assert new[2] == "active" and str(new[1]) == V2, rows
        assert new[3] == "upgrade to v2", rows
        auds = audits_for(str(new[0]))
        assert len(auds) == 1 and auds[0][0] == "routine_job_pin_replaced", auds
        assert auds[0][3] == "upgrade to v2", auds
        return "replace ok + history linked + audit"

    def s10():
        conn = connect()
        cur = conn.cursor()
        ident(cur, SUPPORT)
        st, val = attempt(
            cur, "SELECT public.unpin_service_job_routine(%s,%s,NULL)",
            (J_SUP, "no longer needed"),
        )
        assert st == "ok", f"expected ok got {val}"
        assert val["status"] == "unpinned", val
        conn.commit()
        conn.close()
        rows = pin_rows(J_SUP)
        assert len(rows) == 1 and rows[0][2] == "unpinned", rows
        assert str(rows[0][6]) == SUPPORT and rows[0][7] is not None, rows
        auds = audits_for(str(rows[0][0]))
        assert len(auds) == 2, auds
        assert auds[0][0] == "routine_job_pinned", auds
        assert auds[1][0] == "routine_job_unpinned", auds
        assert auds[1][1] == "active" and auds[1][2] == "unpinned", auds
        assert auds[1][3] == "no longer needed" and auds[1][4] == "support", auds
        return "unpin ok + audit"

    def s11():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_MAIN, V1, "second"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[0] == "22023", val
        assert val[1] == "routine_pin_cardinality", val
        rows = pin_rows(J_MAIN)
        assert [r[2] for r in rows].count("active") == 1, rows
        return "second active pin denied"

    def s11b():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st1, v1 = attempt(
            cur, "SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)",
            (J_NOREASON, V2, "r"),
        )
        conn.rollback()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st2, v2 = attempt(
            cur, "SELECT public.unpin_service_job_routine(%s,%s,NULL)",
            (J_NOREASON, "r"),
        )
        conn.rollback()
        conn.close()
        assert st1 == "err" and v1[0] == "22023", v1
        assert st2 == "err" and v2[0] == "22023", v2
        assert pin_rows(J_NOREASON) == []
        return f"replace/unpin-without-active denied (details: {v1[1]}, {v2[1]})"

    def s12():
        conn = connect()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO public.service_job_visits (job_id, state, attending_technician_id)
               VALUES (%s, 'in_progress', %s)""",
            (J_MAIN, TECH),
        )
        conn.commit()
        conn.close()
        assert boundary(J_MAIN) is not None, "boundary must be set"
        for fn, args in [
            ("SELECT public.pin_service_job_routine(%s,%s,%s,NULL)", (J_MAIN, V1, "r")),
            ("SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)", (J_MAIN, V1, "r")),
            ("SELECT public.unpin_service_job_routine(%s,%s,NULL)", (J_MAIN, "r")),
        ]:
            conn = connect()
            cur = conn.cursor()
            ident(cur, ADMIN)
            st, val = attempt(cur, fn, args)
            conn.rollback()
            conn.close()
            assert st == "err" and val[0] == "22023", (fn, val)
            assert val[1] == "routine_pin_locked_after_start", (fn, val)
        rows = pin_rows(J_MAIN)
        assert [r[2] for r in rows].count("active") == 1, rows
        return "post-start pin/replace/unpin all locked"

    def s13():
        conn = connect()
        cur = conn.cursor()
        cur.execute(
            "UPDATE public.service_job_visits SET state='aborted' WHERE job_id=%s",
            (J_MAIN,),
        )
        cur.execute(
            "UPDATE public.service_jobs SET assigned_technician_id=%s, state='cancelled' WHERE id=%s",
            (TECH2, J_MAIN),
        )
        conn.commit()
        conn.close()
        assert boundary(J_MAIN) is not None, "boundary must survive"
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_MAIN, V1, "r"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[1] == "routine_pin_locked_after_start", val
        return "abort/reassign/cancel keeps boundary + lock"

    def s14():
        conn = connect()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO public.service_job_visits (job_id, state, attending_technician_id)
               VALUES (%s, 'in_progress', %s)""",
            (J_R12, TECH2),
        )
        conn.commit()
        conn.close()
        assert boundary(J_R12) is not None
        assert pin_rows(J_R12) == []
        return "visit starts with no pin"

    def s15():
        conn = connect()
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO public.service_job_visits (job_id, state, attending_technician_id)
               VALUES (%s, 'in_progress', %s)""",
            (J_R19, TECH2),
        )
        conn.commit()
        conn.close()
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_R19, V1, "r"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[1] == "routine_pin_locked_after_start", val
        return "initial pin after historical start denied"

    def s16():
        conn = connect()
        cur = conn.cursor()
        ident(cur, TECH)
        st1, v1 = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_TECH, V1, "r"),
        )
        conn.rollback()
        cur = conn.cursor()
        ident(cur, TECH)
        st2, v2 = attempt(
            cur, "SELECT public.replace_service_job_routine_pin(%s,%s,%s,NULL)",
            (J_SUP, V2, "r"),
        )
        conn.rollback()
        cur = conn.cursor()
        ident(cur, TECH)
        st3, v3 = attempt(
            cur, "SELECT public.unpin_service_job_routine(%s,%s,NULL)", (J_MAIN, "r")
        )
        conn.rollback()
        conn.close()
        for st, v in [(st1, v1), (st2, v2), (st3, v3)]:
            assert st == "err" and v[0] == "42501", (st, v)
            assert v[1] == "routine_job_pin_authz_denied", v
        assert pin_rows(J_TECH) == []
        return "tech mutations denied incl. authz-before-state ordering"

    def s17():
        for uid in (CUSTOMER, SALES):
            conn = connect()
            cur = conn.cursor()
            ident(cur, uid)
            st, val = attempt(
                cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
                (J_CUST, V1, "r"),
            )
            conn.rollback()
            conn.close()
            assert st == "err" and val[0] == "42501", (uid, val)
            assert val[1] == "routine_job_pin_authz_denied", (uid, val)
        conn = connect()
        cur = conn.cursor()
        ident(cur, SALES)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_MAIN,)
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[0] == "42501", val
        assert pin_rows(J_CUST) == []
        return "customer/sales mutations + sales read denied"

    def s18():
        conn = connect()
        cur = conn.cursor()
        ident(cur, TECH)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_MAIN,)
        )
        conn.rollback()
        assert st == "ok", f"tech read failed: {val}"
        blob = json.dumps(val)
        for forbidden in ("payload", "sections", "draft", "content"):
            assert forbidden not in blob, f"leaked {forbidden}: {blob}"
        assert val["active"]["routine_version_id"] == V2, val
        cur = conn.cursor()
        ident(cur, TECH)
        st, val = attempt(
            cur, "SELECT public.list_service_job_routine_pin_history(%s,NULL)",
            (J_MAIN,),
        )
        conn.rollback()
        assert st == "ok" and len(val["history"]) == 2, val
        cur = conn.cursor()
        ident(cur, CUSTOMER)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_MAIN,)
        )
        conn.rollback()
        assert st == "err" and val[0] == "42501", val
        cur = conn.cursor()
        ident(cur, CUSTOMER)
        st, val = attempt(
            cur, "SELECT public.list_service_job_routine_pin_history(%s,NULL)",
            (J_MAIN,),
        )
        conn.rollback()
        cur = conn.cursor()
        ident(cur, TECH)
        st2, v2 = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_R7,)
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[0] == "42501", val
        assert st2 == "err" and v2[0] == "42501", ("unassigned tech", v2)
        return "tech reads metadata-only; customer + out-of-scope tech denied"

    def s19():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_R18, Z1, "pin then retire"),
        )
        assert st == "ok", f"expected ok got {val}"
        conn.commit()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.retire_service_routine_version(%s,NULL)", (Z1,)
        )
        assert st == "ok", f"retire failed: {val}"
        conn.commit()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_R18,)
        )
        conn.rollback()
        assert st == "ok", val
        assert val["active"]["version_status"] == "retired", val
        assert val["active"]["retired_badge"] is True, val
        assert val["active"]["reason"] == "pin then retire", val
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_R18B, Z1, "r"),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[1] == "routine_pin_version_retired", val
        return "pin readable after retire; new pin denied"

    def s20():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur,
            """INSERT INTO public.service_job_routine_pins
                 (job_id, routine_id, routine_version_id, status, reason, pinned_by)
               SELECT %s, r.id, %s, 'active', 'direct', %s
               FROM public.service_routines r WHERE r.code = 'LB-SPARK-R1'""",
            (J_TECH, V1, ADMIN),
        )
        conn.rollback()
        assert st == "err" and val[0] == "42501", ("insert", val)
        cur = conn.cursor()
        ident(cur, ADMIN)
        cur.execute("SELECT id FROM public.service_job_routine_pins WHERE job_id=%s AND status='active'", (J_MAIN,))
        target = cur.fetchone()[0]
        st, val = attempt(
            cur,
            "UPDATE public.service_job_routine_pins SET reason='hacked' WHERE id=%s",
            (target,),
        )
        conn.rollback()
        assert st == "err" and val[0] == "42501", ("update", val)
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur,
            "DELETE FROM public.service_job_routine_pins WHERE id=%s",
            (target,),
        )
        conn.rollback()
        assert st == "err" and val[0] == "42501", ("delete", val)
        cur = conn.cursor()
        ident(cur, CUSTOMER)
        cur.execute("SELECT count(*) FROM public.service_job_routine_pins")
        assert cur.fetchone()[0] == 0, "customer sees 0 rows"
        cur = conn.cursor()
        ident(cur, TECH)
        cur.execute(
            "SELECT count(*) FROM public.service_job_routine_pins WHERE job_id=%s",
            (J_MAIN,),
        )
        assert cur.fetchone()[0] == 2, "tech sees own-ticket rows"
        conn.rollback()
        conn.close()
        rows = pin_rows(J_MAIN)
        assert [r[2] for r in rows].count("active") == 1, rows
        return "direct writes blocked; RLS select scoped"

    def s21():
        for uid in (ADMIN, TECH):
            conn = connect()
            cur = conn.cursor()
            ident(cur, uid)
            st, val = attempt(
                cur,
                "UPDATE public.service_jobs SET work_started_boundary_at=NULL WHERE id=%s",
                (J_MAIN,),
            )
            conn.rollback()
            conn.close()
            assert st == "err" and val[0] == "42501", (uid, val)
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur,
            "UPDATE public.service_job_visits SET state='scheduled' WHERE job_id=%s",
            (J_MAIN,),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[0] == "42501", ("visits", val)
        assert boundary(J_MAIN) is not None, "boundary intact"
        return "boundary cannot be cleared via client paths"

    def s22():
        before = audit_count()
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.pin_service_job_routine(%s,%s,%s,NULL)",
            (J_CUST, V1, None),
        )
        conn.rollback()
        conn.close()
        assert st == "err" and val[1] == "routine_pin_reason_required", val
        assert audit_count() == before, "denied write leaves audit unchanged"
        return "denied-write audit rollback confirmed"

    def s23():
        conn = connect()
        cur = conn.cursor()
        ident(cur, ADMIN)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_R12,)
        )
        conn.rollback()
        assert st == "ok" and val["active"] is None and val["pin_locked"] is True, val
        cur = conn.cursor()
        ident(cur, TECH)
        st, val = attempt(
            cur, "SELECT public.get_service_job_routine_pin(%s,NULL)", (J_TECH,)
        )
        conn.rollback()
        conn.close()
        assert st == "ok" and val["active"] is None and val["pin_locked"] is False, val
        return "empty get_ reflects lock state"

    checks = [
        ("S-01", "RB-01 admin pin + audit", s01),
        ("S-02", "RB-01 support pin", s02),
        ("S-03", "RB-02 reason required", s03),
        ("S-04", "RB-03 draft/in_review", s04),
        ("S-05", "RB-04 retired version", s05),
        ("S-06", "RB-05 mismatch + positive control", s06),
        ("S-07", "RB-06 unlinked/uncatalogued/uncertain", s07),
        ("S-08", "RB-07 pin stays V1", s08),
        ("S-09", "RB-08 replace", s09),
        ("S-10", "RB-09 unpin", s10),
        ("S-11", "RB-14 cardinality", s11),
        ("S-11b", "replace/unpin without active (observed)", s11b),
        ("S-12", "RB-10 post-start lock", s12),
        ("S-13", "RB-11 boundary permanence", s13),
        ("S-14", "RB-12 start without pin", s14),
        ("S-15", "RB-19 initial pin after start", s15),
        ("S-16", "RB-15 technician denied", s16),
        ("S-17", "RB-16 customer/sales denied", s17),
        ("S-18", "RB-17 read scoping", s18),
        ("S-19", "RB-18 readable after retire", s19),
        ("S-20", "RB-20 direct writes + RLS", s20),
        ("S-21", "boundary bypass probes", s21),
        ("S-22", "denied-write audit rollback", s22),
        ("S-23", "empty get_ lock reflection", s23),
    ]
    for cid, name, fn in checks:
        check(cid, name, fn)


if __name__ == "__main__":
    main()
    n_pass = sum(1 for r in RESULTS if r["pass"])
    with open("spark_lane_b_serial_results.json", "w", encoding="utf-8") as f:
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
    print(f"SERIAL {n_pass}/{len(RESULTS)}")
    sys.exit(0 if n_pass == len(RESULTS) else 1)
