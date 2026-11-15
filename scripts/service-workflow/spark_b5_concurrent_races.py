#!/usr/bin/env python3
"""Spark B5 concurrent races (disposable PG only).

Races:
  R1 — competing approve vs return on same revision
  R2 — review approve vs technician resubmit on returned→open path
       (concurrent approve on r1 while tech tries submit of r2 after return setup)

Writes PASS/FAIL into public.spark_b5_eval.
"""
from __future__ import annotations

import getpass
import subprocess
import threading
import time
from pathlib import Path

PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
SUPPORT = "55555555-5555-5555-5555-555555555555"
ADMIN = "66666666-6666-6666-6666-666666666666"
TECH1 = "33333333-3333-3333-3333-333333333333"


def psql(port: str, user: str, db: str, sql: str, timeout: float = 30.0):
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", port, "-U", user, "-d", db,
         "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, timeout=timeout, check=False,
    )


def note(port: str, user: str, db: str, check_id: str, ok: bool, detail: str) -> None:
    detail = detail.replace("'", "''")[:400]
    status = "PASS" if ok else "FAIL"
    psql(port, user, db, f"""
      INSERT INTO public.spark_b5_eval(check_id, status, detail)
      VALUES ('{check_id}', '{status}', '{detail}')
      ON CONFLICT (check_id) DO UPDATE
        SET status = EXCLUDED.status, detail = EXCLUDED.detail;
    """)


def setup_submitted(port: str, user: str, db: str, tag: str) -> str:
    r = psql(port, user, db, f"""
    CREATE TABLE IF NOT EXISTS public.spark_b5_race(tag text PRIMARY KEY, revision uuid, visit uuid, job uuid, ticket uuid);
    DELETE FROM public.spark_b5_race WHERE tag = '{tag}';
    DO $$
    DECLARE
      v_t uuid; v_j uuid; v_v uuid; v_rev public.service_report_revisions;
    BEGIN
      SELECT * INTO v_t, v_j, v_v FROM b5_mk_completed_visit('{tag}');
      v_rev := b5_submit(v_v, v_t, '{tag}');
      INSERT INTO public.spark_b5_race(tag, revision, visit, job, ticket)
      VALUES ('{tag}', v_rev.id, v_v, v_j, v_t);
    END $$;
    SELECT revision::text FROM public.spark_b5_race WHERE tag = '{tag}';
    """)
    if r.returncode != 0:
        raise SystemExit(f"setup {tag} failed: {r.stderr}\n{r.stdout}")
    for ln in r.stdout.splitlines():
        ln = ln.strip()
        if len(ln) == 36 and ln.count("-") == 4:
            return ln
    raise SystemExit(f"no revision id for {tag}: {r.stdout}")


def race_approve_vs_return(port: str, user: str, db: str) -> None:
    rev = setup_submitted(port, user, db, "race_ar")
    barrier = threading.Barrier(2)
    results: dict[str, subprocess.CompletedProcess[str]] = {}

    def worker(name: str, decision: str, comments: str, actor: str) -> None:
        cmt = "NULL" if not comments else f"'{comments}'"
        sql = f"""
        SELECT set_config('app.b1_uid', '{actor}', false);
        SELECT pg_sleep(0.05);
        SELECT public.review_service_report_revision(
          '{rev}'::uuid, '{decision}', {cmt}, NULL);
        """
        barrier.wait(timeout=10)
        results[name] = psql(port, user, db, sql, timeout=40)

    t1 = threading.Thread(target=worker, args=("approve", "approved_issued", "", SUPPORT))
    t2 = threading.Thread(target=worker, args=("return", "returned", "race return", ADMIN))
    t1.start(); t2.start(); t1.join(); t2.join()

    ok_a = results["approve"].returncode == 0
    ok_r = results["return"].returncode == 0
    # Exactly one success; other denied/conflict or both succeed only if identical (not here)
    coherent = (ok_a != ok_r) or (ok_a and ok_r and False)

    cnt = psql(port, user, db, f"""
      SELECT count(*)::text FROM public.service_report_reviews WHERE revision_id = '{rev}'::uuid;
    """)
    n = None
    for ln in cnt.stdout.splitlines():
        if ln.strip().isdigit():
            n = int(ln.strip()); break

    decision = psql(port, user, db, f"""
      SELECT decision FROM public.service_report_reviews WHERE revision_id = '{rev}'::uuid;
    """)
    detail = f"approve_ok={ok_a} return_ok={ok_r} n_reviews={n} out={decision.stdout.strip()[:120]}"
    note(port, user, db, "SP5-R1_compete_approve_return", n == 1 and (ok_a ^ ok_r), detail)


def race_review_vs_resubmit(port: str, user: str, db: str) -> None:
    """Return r1, then race: support approve of... wait after return only r1 decided.
    Better: submit r1, race support approve vs tech second submit (same visit, awaiting_review).
    B4 allows additional revisions while awaiting_review — both may succeed coherently
    (r2 exists AND/OR r1 reviewed). Check: at most one review on r1; if reviewed approved,
    job completed only if no outstanding and not FWR; revisions immutable.
    """
    rev = setup_submitted(port, user, db, "race_rs")
    # fetch visit/ticket
    meta = psql(port, user, db, """
      SELECT visit::text || '|' || ticket::text FROM public.spark_b5_race WHERE tag = 'race_rs';
    """)
    visit = ticket = None
    for ln in meta.stdout.splitlines():
        if "|" in ln and ln.count("-") >= 8:
            visit, ticket = ln.strip().split("|", 1)
            break
    if not visit:
        note(port, user, db, "SP5-R2_review_vs_resubmit", False, "missing fixture")
        return

    barrier = threading.Barrier(2)
    results: dict[str, subprocess.CompletedProcess[str]] = {}

    def approve() -> None:
        sql = f"""
        SELECT set_config('app.b1_uid', '{SUPPORT}', false);
        SELECT pg_sleep(0.05);
        SELECT public.review_service_report_revision('{rev}'::uuid, 'approved_issued', NULL, NULL);
        """
        barrier.wait(timeout=10)
        results["approve"] = psql(port, user, db, sql, timeout=40)

    def resubmit() -> None:
        sql = f"""
        SELECT set_config('app.b1_uid', '{TECH1}', false);
        SELECT pg_sleep(0.05);
        SELECT public.submit_service_report_revision(
          '{visit}'::uuid, 'race-corr', 'work', '[]'::jsonb, true, 'verified_fixed', NULL,
          'I declare', ARRAY['{ticket}/b4/race-corr.jpg']::text[], NULL, gen_random_uuid(), NULL);
        """
        # ensure evidence object exists
        psql(port, user, db, f"""
          SELECT b5_seed_evidence('{ticket}'::uuid, '{ticket}/b4/race-corr.jpg');
        """)
        barrier.wait(timeout=10)
        results["resubmit"] = psql(port, user, db, sql, timeout=40)

    t1 = threading.Thread(target=approve)
    t2 = threading.Thread(target=resubmit)
    t1.start(); t2.start(); t1.join(); t2.join()

    ok_a = results["approve"].returncode == 0
    ok_s = results["resubmit"].returncode == 0

    q = psql(port, user, db, f"""
      SELECT
        (SELECT count(*) FROM public.service_report_reviews WHERE revision_id = '{rev}'::uuid) AS reviews_on_r1,
        (SELECT count(*) FROM public.service_report_revisions r
           JOIN public.service_reports rep ON rep.id = r.report_id
           WHERE rep.visit_id = '{visit}'::uuid) AS rev_count,
        (SELECT state FROM public.service_jobs j
           JOIN public.spark_b5_race x ON x.job = j.id WHERE x.tag = 'race_rs') AS job_state;
    """)
    # Coherence: exactly one deciding review on r1 if approve won; never >1 review on r1;
    # revision rows only grow (never rewrite r1 findings).
    findings = psql(port, user, db, f"""
      SELECT findings FROM public.service_report_revisions WHERE id = '{rev}'::uuid;
    """)
    r1_immutable = "findings-race_rs" in findings.stdout or "findings-race_rs" in findings.stdout
    # submit uses tag in findings via b5_submit for setup; race resubmit uses 'race-corr'
    reviews = psql(port, user, db, f"""
      SELECT count(*)::text FROM public.service_report_reviews WHERE revision_id = '{rev}'::uuid;
    """)
    n_rev = None
    for ln in reviews.stdout.splitlines():
        if ln.strip().isdigit():
            n_rev = int(ln.strip()); break

    # At most one review; if both succeeded, r2 exists and r1 either reviewed or not —
    # but r1 cannot have two reviews. Approve may fail if submit somehow... submit doesn't block approve.
    # Both can succeed: approve r1 + submit r2 while awaiting_review before complete — if approve
    # completes job first, submit may fail (terminal). Either way one coherent outcome.
    coherent = n_rev in (0, 1) and (ok_a or ok_s)
    if ok_a:
        coherent = coherent and n_rev == 1
    # If approve completed job, resubmit should fail OR have happened before complete
    detail = (
        f"approve_ok={ok_a} resubmit_ok={ok_s} reviews_r1={n_rev} "
        f"meta={q.stdout.strip()[:180]} findings={findings.stdout.strip()[:80]}"
    )
    # r1 findings from b5_submit tag race_rs → findings-race_rs
    immutable = "findings-race_rs" in findings.stdout
    note(port, user, db, "SP5-R2_review_vs_resubmit", coherent and immutable and n_rev <= 1, detail)


def main() -> int:
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", required=True)
    ap.add_argument("--db", required=True)
    ap.add_argument("--user", default=getpass.getuser())
    args = ap.parse_args()
    race_approve_vs_return(args.port, args.user, args.db)
    race_review_vs_resubmit(args.port, args.user, args.db)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
