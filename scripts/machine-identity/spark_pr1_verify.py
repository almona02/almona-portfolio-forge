#!/usr/bin/env python3
"""Spark independent PR1 verification battery (machine identity).

Covers: concurrent registration, idempotency conflict/scope, duplicate
handling incl. retired, cross-customer non-disclosure, missing serial /
uncatalogued registration, ticket linking authz, identity-edit UUID/audit
behavior, and both disposable migration baselines.

Local disposable Postgres only. Never touches staging/production remotes.
Results: .artifacts/slice0/machine-identity/spark_pr1_results.json
"""
from __future__ import annotations

import concurrent.futures
import json
import os
import sys
import uuid
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[2]
MIGRATION = ROOT / "supabase/migrations/20261111180000_machine_identity_pr1.sql"
OUT = ROOT / ".artifacts/slice0/machine-identity/spark_pr1_results.json"
PORT = int(os.environ.get("MI_PGPORT", "55435"))
HOST = "127.0.0.1"
USER = "postgres"

OWNER_A = "b2000000-0000-4000-8000-000000000001"
OWNER_B = "b2000000-0000-4000-8000-000000000002"
OWNER_C = "b2000000-0000-4000-8000-000000000004"
STAFF = "b2000000-0000-4000-8000-000000000099"
TECH = "b2000000-0000-4000-8000-000000000003"


def admin_conn(db: str):
    c = psycopg2.connect(host=HOST, port=PORT, user=USER, dbname=db)
    c.autocommit = True
    c.set_client_encoding('UTF8')
    return c


def fresh_db(name: str) -> None:
    c = admin_conn("postgres")
    cur = c.cursor()
    cur.execute(
        "SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
        "WHERE datname = %s AND pid <> pg_backend_pid();",
        (name,),
    )
    cur.execute(f'DROP DATABASE IF EXISTS "{name}";')
    cur.execute(f'CREATE DATABASE "{name}";')
    c.close()


def auth_as(cur, uid: str) -> None:
    cur.execute("SELECT set_config('request.jwt.claim.sub', %s, false);", (uid,))
    cur.execute(
        "SELECT set_config('request.jwt.claims', %s, false);",
        (json.dumps({"sub": uid, "role": "authenticated",
                     "is_anonymous": False}),),
    )


def seed_users(cur) -> None:
    cur.execute(
        "INSERT INTO auth.users(id) VALUES (%s), (%s), (%s), (%s), (%s) "
        "ON CONFLICT DO NOTHING;",
        (OWNER_A, OWNER_B, OWNER_C, STAFF, TECH),
    )
    cur.execute(
        "INSERT INTO public.profiles(id, role) VALUES "
        "(%s, 'customer'), (%s, 'customer'), (%s, 'customer'), "
        "(%s, 'admin'), (%s, 'technician') "
        "ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;",
        (OWNER_A, OWNER_B, OWNER_C, STAFF, TECH),
    )


class Checks:
    def __init__(self) -> None:
        self.rows: dict[str, dict] = {}

    def record(self, check_id: str, ok: bool, detail: str = "") -> None:
        self.rows[check_id] = {"status": "PASS" if ok else "FAIL",
                               "detail": str(detail)[:400]}

    def fails(self) -> list[str]:
        return [k for k, v in self.rows.items() if v["status"] != "PASS"]


PROD_BASE = """
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.machines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  model text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  purchase_date date,
  warranty_expiry date,
  created_at timestamptz DEFAULT timezone('utc', now()),
  updated_at timestamptz DEFAULT timezone('utc', now()),
  installation_date date,
  warranty_valid boolean DEFAULT false,
  photo_urls text[]
);
CREATE TABLE public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  title text,
  status text,
  assigned_to uuid,
  machine_id uuid REFERENCES public.machines(id) ON DELETE SET NULL,
  machine_serial_number text,
  machine_model text,
  updated_at timestamptz DEFAULT timezone('utc', now())
);
"""

STAGING_BASE = """
CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id uuid PRIMARY KEY);
CREATE TABLE public.service_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  title text,
  status text,
  assigned_to uuid,
  machine_serial_number text,
  machine_model text,
  updated_at timestamptz DEFAULT timezone('utc', now())
);
"""


def apply_migration(db: str) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    cur.execute(MIGRATION.read_text(encoding="utf-8"))
    c.close()


def register(cur, uid, name, model, serial, brand="acme", catalog=None,
             uncertain=False, key=None, source="spark_battery",
             missing_reason=None):
    auth_as(cur, uid)
    cur.execute(
        "SELECT public.register_machine_identity("
        "%s,%s,%s,%s,%s,%s,NULL,NULL,NULL,%s,%s,NULL,%s);",
        (name, model, serial, brand, catalog, uncertain, key, source,
         missing_reason),
    )
    return cur.fetchone()[0]


def test_concurrency(db: str, ck: Checks) -> None:
    key = f"spark-race-{uuid.uuid4().hex[:8]}"
    barrier = concurrent.futures.ThreadPoolExecutor(max_workers=8)

    def attempt(_: int):
        c = admin_conn(db)
        cur = c.cursor()
        try:
            r = register(cur, OWNER_A, "Race Press", "RP-9", "RP9-RACE-001",
                         key=key)
            return ("ok", r["machine_id"], bool(r.get("idempotent")))
        except Exception as e:  # noqa: BLE001 - racing asserts on sqlstate
            return ("err", getattr(e, "pgcode", "?"),
                    str(e).strip().splitlines()[0][:120])
        finally:
            c.close()

    futs = [barrier.submit(attempt, i) for i in range(8)]
    outs = [f.result() for f in concurrent.futures.as_completed(futs)]
    barrier.shutdown()
    c = admin_conn(db)
    cur = c.cursor()
    cur.execute("SELECT COUNT(*), COUNT(DISTINCT id) FROM public.machines "
                "WHERE registration_idempotency_key = %s;", (key,))
    n, distinct = cur.fetchone()
    c.close()
    ids = {o[1] for o in outs if o[0] == "ok"}
    codes = {o[1] for o in outs if o[0] == "err"}
    ck.record("S1_concurrent_one_row", n == 1 and distinct == 1,
              f"rows={n} distinct={distinct}")
    ck.record("S1_concurrent_same_id_or_race_err",
              len(ids) <= 1 and codes <= {"23505"},
              f"ids={len(ids)} errcodes={sorted(codes)} outcomes={outs!r}"[:400])


def test_idempotency(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    key = f"spark-idem-{uuid.uuid4().hex[:8]}"
    r1 = register(cur, OWNER_A, "Idem Mill", "IM-2", "IM2-555",
                  key=key)
    r2 = register(cur, OWNER_A, "Idem Mill", "IM-2", "IM2-555",
                  key=key)
    ck.record("S2_idempotent_retry_same_id",
              r2.get("idempotent") is True
              and r2["machine_id"] == r1["machine_id"],
              f'{r1["machine_id"]}')
    for label, kwargs in (
        ("serial", {"serial": "IM2-999"}),
        ("model", {"model": "IM-3"}),
        ("brand", {"brand": "other"}),
    ):
        try:
            params = {"name": "Idem Mill", "model": "IM-2",
                      "serial": "IM2-555", "key": key}
            params.update(kwargs)
            register(cur, OWNER_A, **params)
            ck.record(f"S2_conflict_{label}", False, "no error")
        except psycopg2.Error as e:
            ck.record(f"S2_conflict_{label}", e.pgcode == "22023"
                      and "conflicting payload" in str(e),
                      f"{e.pgcode} {str(e).strip().splitlines()[0]}"[:200])
    # Same key, different owner, different serial -> no collision
    r3 = register(cur, OWNER_B, "Idem Mill B", "IM-2", "IM2-777",
                  key=key)
    ck.record("S3_key_owner_scoped",
              r3["machine_id"] != r1["machine_id"]
              and r3.get("idempotent") is False,
              f'a={r1["machine_id"]} b={r3["machine_id"]}')
    # Same serial across owners (fresh key) -> staff case only; customer stays clear
    r4 = register(cur, OWNER_B, "Idem Mill B2", "IM-2", "IM2-555",
                  key=f"{key}-b2")
    cur.execute(
        "SELECT COUNT(*) FROM public.machine_duplicate_cases "
        "WHERE serial_canonical = %s AND incoming_owner_id = %s "
        "AND candidate_machine_id = %s AND status = 'open';",
        ("IM2-555", OWNER_B, r1["machine_id"]),
    )
    case_n = cur.fetchone()[0]
    ck.record("S3_same_serial_other_owner_review",
              r4["identity_review_status"] == "clear"
              and coalesce_false(r4.get("needs_staff_review")) is False
              and r4["machine_id"] not in (r1["machine_id"], r3["machine_id"])
              and case_n == 1,
              f'review={r4["identity_review_status"]} cases={case_n}')
    c.close()


def coalesce_false(v):
    return False if v is None else bool(v)


def allow_protected(cur, on: bool = True) -> None:
    cur.execute(
        "SELECT set_config('machine_identity.allow_protected_update', %s, false);",
        ("on" if on else "off",),
    )


def detect(cur, uid, serial, brand="acme"):
    auth_as(cur, uid)
    cur.execute("SELECT public.machine_duplicate_detect(%s, %s);",
                (serial, brand))
    return cur.fetchone()[0]


def test_duplicates(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    serial = f"DUP-{tag}"
    ra = register(cur, OWNER_A, "Dup A", "DM-1", serial,
                  key=f"spark-dup-a-{tag}")
    rb = register(cur, OWNER_B, "Dup B", "DM-1", serial,
                  key=f"spark-dup-b-{tag}")
    cur.execute("SELECT id, candidate_machine_id, status, "
                "separator_insensitive_flag FROM public.machine_duplicate_cases "
                "WHERE serial_canonical = %s ORDER BY created_at DESC LIMIT 1;",
                (serial.upper(),))
    row = cur.fetchone()
    ck.record("S4_case_row", row is not None and row[2] == "open"
              and str(row[1]) == ra["machine_id"] and row[3] is False,
              f"candidate_is_first={row is not None and str(row[1]) == ra['machine_id']}")
    # Retire the first machine; both owner and staff detection still list it
    allow_protected(cur, True)
    cur.execute("UPDATE public.machines SET identity_lifecycle = 'retired' "
                "WHERE id = %s;", (ra["machine_id"],))
    allow_protected(cur, False)
    own = detect(cur, OWNER_A, serial)
    own_ids = [m["machine_id"] for m in own["own_matches"]]
    ck.record("S4_retired_in_own_detect", ra["machine_id"] in own_ids
              and any(m["identity_lifecycle"] == "retired"
                      for m in own["own_matches"]),
              f"own={own_ids}")
    staff = detect(cur, STAFF, serial)
    staff_ids = [m["machine_id"] for m in staff["staff_matches"]]
    ck.record("S4_retired_in_staff_detect",
              ra["machine_id"] in staff_ids and rb["machine_id"] in staff_ids,
              f"staff_n={len(staff_ids)}")
    masked = staff["staff_matches"][0].get("masked_serial", "")
    ck.record("S4_staff_masked_no_owner",
              "owner_id" not in json.dumps(staff["staff_matches"])
              and masked.endswith(serial[-4:]) and "*" in masked,
              f"masked={masked}")
    # Separator-insensitive foreign-only (third owner): staff case; customer stays clear
    sep_serial = serial.replace("-", " ")
    rs = register(cur, OWNER_C, "Dup Sep", "DM-1", sep_serial,
                  key=f"spark-dup-sep-{tag}")
    cur.execute("SELECT separator_insensitive_flag, candidate_machine_id "
                "FROM public.machine_duplicate_cases "
                "WHERE serial_raw = %s ORDER BY created_at DESC LIMIT 1;",
                (sep_serial,))
    srow = cur.fetchone()
    cur.execute("SELECT COUNT(*) FROM public.machines WHERE id = %s;",
                (rs["machine_id"],))
    own_row = cur.fetchone()[0]
    ck.record("S4_sep_flag_only",
              rs["identity_review_status"] == "clear"
              and coalesce_false(rs.get("needs_staff_review")) is False
              and srow is not None and srow[0] is True and srow[1] is None
              and own_row == 1,
              f"review={rs['identity_review_status']} candidate_null={srow and srow[1] is None}")
    c.close()


def test_nondisclosure(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    serial = f"PRIV-{tag}"
    ra = register(cur, OWNER_A, "Priv A", "PV-1", serial,
                  key=f"spark-priv-{tag}")
    foreign = [OWNER_A, ra["machine_id"]]
    d = detect(cur, OWNER_B, serial)
    blob = json.dumps(d)
    ck.record("S5_detect_no_foreign",
              d["own_matches"] == [] and d["staff_matches"] == []
              and d["foreign_match_exists"] is None
              and not any(f in blob for f in foreign),
              f"own={d['own_matches']} foreign_flag={d['foreign_match_exists']}")
    r = register(cur, OWNER_B, "Priv B", "PV-1", serial,
                 key=f"spark-priv-b-{tag}")
    rblob = json.dumps(r)
    ck.record("S5_register_no_foreign",
              r["identity_review_status"] == "clear"
              and coalesce_false(r.get("needs_staff_review")) is False
              and not any(f in rblob for f in foreign)
              and "provisional_asset_ref" in r
              and r["provisional_asset_ref"] is None,
              f"review={r['identity_review_status']}")
    # Customer sep flag stays false when only foreign sep variants exist (third owner)
    d2 = detect(cur, OWNER_C, serial.replace("-", " "), brand="acme")
    ck.record("S5_sep_flag_boolean",
              isinstance(d.get("review_flag_separator_insensitive"), bool)
              and d.get("review_flag_separator_insensitive") is False
              and d2.get("review_flag_separator_insensitive") is False,
              f"flag={d.get('review_flag_separator_insensitive')} "
              f"sep_probe={d2.get('review_flag_separator_insensitive')}")
    # Staff-only duplicate event must not appear in owner_visible trail
    cur.execute(
        "SELECT COUNT(*) FROM public.machine_identity_events "
        "WHERE machine_id = %s AND event_type = 'duplicate_case_opened' "
        "AND visibility = 'staff_only';",
        (r["machine_id"],),
    )
    staff_ev = cur.fetchone()[0]
    cur.execute(
        "SELECT COUNT(*) FROM public.machine_identity_events "
        "WHERE machine_id = %s AND visibility = 'owner_visible' "
        "AND after_values ? 'duplicate_case_id';",
        (r["machine_id"],),
    )
    owner_leak = cur.fetchone()[0]
    ck.record("S5_staff_only_duplicate_audit",
              staff_ev == 1 and owner_leak == 0,
              f"staff_ev={staff_ev} owner_leak={owner_leak}")
    c.close()


def test_serial_catalog(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    try:
        register(cur, OWNER_A, "No Plate", "NP-1", None,
                 key=f"spark-miss-{tag}")
        ck.record("S6_missing_reason_required", False, "no error")
    except psycopg2.Error as e:
        ck.record("S6_missing_reason_required", e.pgcode == "22023",
                  f"{e.pgcode}")
    r = register(cur, OWNER_A, "No Plate", "NP-1", None,
                 key=f"spark-miss2-{tag}", missing_reason="plate_destroyed")
    cur.execute("SELECT serial_number, serial_canonical, provisional_asset_ref,"
                " manufacturer_validation_status, legacy_gaps "
                "FROM public.machines WHERE id = %s;", (r["machine_id"],))
    row = cur.fetchone()
    ck.record("S6_provisional",
              r["identity_confidence"] == "provisional"
              and row[0] is None and row[1] is None
              and row[2].startswith("ALM-") and row[3] == "not_applicable"
              and "plate_destroyed" in json.dumps(row[4]),
              f"conf={r['identity_confidence']} alm={row[2]}")
    u = register(cur, OWNER_A, "Custom Saw", "Shop built", "CS-42",
                 catalog=None, uncertain=False, key=f"spark-uncat-{tag}")
    cur.execute("SELECT catalog_model_id, catalog_uncertain, catalog_link_status, "
                "legacy_gaps FROM public.machines WHERE id = %s;",
                (u["machine_id"],))
    urow = cur.fetchone()
    ck.record("S6_uncatalogued",
              u.get("catalog_link_status") == "uncatalogued"
              and urow[0] is None and urow[1] is False
              and urow[2] == "uncatalogued"
              and "catalog_unlinked" in json.dumps(urow[3]),
              f"status={u.get('catalog_link_status')}")
    unc = register(cur, OWNER_A, "Maybe Saw", "Shop?", "CS-43",
                   catalog=None, uncertain=True, key=f"spark-uncert-{tag}")
    ck.record("S6_uncertain",
              unc.get("catalog_link_status") == "uncertain",
              f"status={unc.get('catalog_link_status')}")
    linked = register(cur, OWNER_A, "Cat Saw", "CS-Model", "CS-44",
                      catalog="cs-model", uncertain=False,
                      key=f"spark-linked-{tag}")
    ck.record("S6_linked",
              linked.get("catalog_link_status") == "linked",
              f"status={linked.get('catalog_link_status')}")
    c.close()


def link(cur, uid, ticket_id, machine_id):
    auth_as(cur, uid)
    cur.execute("SELECT (public.link_ticket_machine(%s, %s)).machine_id;",
                (ticket_id, machine_id))
    return str(cur.fetchone()[0])


def test_linking(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    ma = register(cur, OWNER_A, "Link A", "LK-1", f"LINK-{tag}",
                  key=f"spark-link-a-{tag}")["machine_id"]
    mb = register(cur, OWNER_B, "Link B", "LK-1", f"LINKB-{tag}",
                  key=f"spark-link-b-{tag}")["machine_id"]
    ta, tb = str(uuid.uuid4()), str(uuid.uuid4())
    cur.execute("INSERT INTO public.service_tickets(id, ticket_number, user_id,"
                " title, status) VALUES (%s, %s, %s, 't', 'open'), "
                "(%s, %s, %s, 't', 'open');",
                (ta, f"SPK-{tag}-A", OWNER_A, tb, f"SPK-{tag}-B", OWNER_B))
    got = link(cur, OWNER_A, ta, ma)
    ck.record("S7_owner_link", got == ma, f"machine_id_set={got == ma}")
    cur.execute("SELECT COUNT(*) FROM public.machine_identity_events "
                "WHERE machine_id = %s AND event_type = 'ticket_linked';",
                (ma,))
    ck.record("S7_link_event", cur.fetchone()[0] == 1, "ticket_linked x1")
    try:
        link(cur, OWNER_B, tb, ma)
        ck.record("S7_cross_machine_deny", False, "no error")
    except psycopg2.Error as e:
        ck.record("S7_cross_machine_deny", e.pgcode == "42501",
                  f"{e.pgcode}")
    try:
        link(cur, OWNER_B, ta, mb)
        ck.record("S7_cross_ticket_deny", False, "no error")
    except psycopg2.Error as e:
        ck.record("S7_cross_ticket_deny", e.pgcode == "42501",
                  f"{e.pgcode}")
    got = link(cur, STAFF, tb, ma)
    ck.record("S7_staff_link", got == ma, "staff override")
    # PR1: technician linking deferred — deny even when assigned to ticket
    cur.execute("UPDATE public.service_tickets SET assigned_to = %s "
                "WHERE id = %s;", (TECH, ta))
    try:
        link(cur, TECH, ta, ma)
        ck.record("S7_assigned_tech_foreign_machine_deny", False, "no error")
    except psycopg2.Error as e:
        ck.record("S7_assigned_tech_foreign_machine_deny", e.pgcode == "42501",
                  f"{e.pgcode}")
    c.close()


def test_linking_tech(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    mt = register(cur, TECH, "Link T", "LK-1", f"LINKT-{tag}",
                  key=f"spark-link-t-{tag}")["machine_id"]
    tt = str(uuid.uuid4())
    cur.execute("INSERT INTO public.service_tickets(id, ticket_number, user_id,"
                " title, status, assigned_to) VALUES (%s, %s, %s, 't', 'open', %s);",
                (tt, f"SPK-{tag}-T", OWNER_A, TECH))
    try:
        link(cur, TECH, tt, mt)
        ck.record("S7_assigned_tech_link_deferred", False, "unexpected allow")
    except psycopg2.Error as e:
        ck.record("S7_assigned_tech_link_deferred", e.pgcode == "42501",
                  f"{e.pgcode} {str(e).strip().splitlines()[0][:120]}")
    c.close()


def test_edits(db: str, ck: Checks) -> None:
    # PR1 defers identity corrections: protected fields blocked; UUID immutable
    # independently of audit FKs. Non-identity fields may still update.
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    mid = register(cur, OWNER_A, "Edit Me", "EM-1", f"EDIT-{tag}",
                   key=f"spark-edit-{tag}")["machine_id"]
    cur.execute("UPDATE public.machines SET name = 'Edited' WHERE id = %s "
                "RETURNING id;", (mid,))
    ck.record("S8_edit_uuid_stable", str(cur.fetchone()[0]) == mid,
              "id unchanged by non-identity UPDATE")
    cur.execute("SELECT COUNT(*) FROM public.machines WHERE id = %s;", (mid,))
    ck.record("S8_edit_no_dup_row", cur.fetchone()[0] == 1, "one row")
    try:
        cur.execute("UPDATE public.machines SET identity_review_status = "
                    "'serial_disputed' WHERE id = %s;", (mid,))
        ck.record("S8_protected_edit_blocked", False, "protected update allowed")
    except psycopg2.Error as e:
        ck.record("S8_protected_edit_blocked", e.pgcode == "42501",
                  f"{e.pgcode}")
        # keep connection usable after error
        c.rollback()
        c.autocommit = True
    cur.execute("SELECT COUNT(*) FROM public.machine_identity_events "
                "WHERE machine_id = %s;", (mid,))
    n_before = cur.fetchone()[0]
    cur.execute("UPDATE public.machines SET site_label = 'bay-2' "
                "WHERE id = %s;", (mid,))
    cur.execute("SELECT COUNT(*) FROM public.machine_identity_events "
                "WHERE machine_id = %s;", (mid,))
    n_after = cur.fetchone()[0]
    ck.record("S8_nonidentity_update_no_false_audit", n_after == n_before,
              f"events {n_before}->{n_after}; site_label allowed, no invented audit")
    try:
        cur.execute("UPDATE public.machines SET id = %s WHERE id = %s;",
                    (str(uuid.uuid4()), mid))
        ck.record("S8_uuid_immutable", False, "id UPDATE succeeded")
    except psycopg2.Error as e:
        c.rollback()
        c.autocommit = True
        cur.execute("SELECT COUNT(*) FROM public.machines WHERE id = %s;",
                    (mid,))
        ck.record("S8_uuid_immutable", cur.fetchone()[0] == 1,
                  f"rejected {e.pgcode}; row intact")
    c.close()


def test_pr1_audit_completeness(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    tag = uuid.uuid4().hex[:8]
    serial = f"AUD-{tag}"
    key = f"spark-audit-{tag}"
    mid = register(cur, OWNER_A, "Audit A", "AU-1", serial,
                   key=key)["machine_id"]
    register(cur, OWNER_A, "Audit A", "AU-1", serial, key=key)
    tid = str(uuid.uuid4())
    cur.execute("INSERT INTO public.service_tickets(id, ticket_number, user_id,"
                " title, status) VALUES (%s, %s, %s, 't', 'open');",
                (tid, f"SPK-{tag}-AU", OWNER_A))
    link(cur, OWNER_A, tid, mid)
    rb = register(cur, OWNER_B, "Audit B", "AU-1", serial,
                  key=f"{key}-b")
    cur.execute("SELECT event_type, actor_id, reason FROM "
                "public.machine_identity_events WHERE machine_id = %s "
                "AND visibility = 'owner_visible';",
                (mid,))
    types = {r[0] for r in cur.fetchall()}
    ck.record("S8_pr1_actions_audited",
              {"registered", "idempotent_replay", "ticket_linked"} <= types,
              f"types={sorted(types)}")
    cur.execute("SELECT after_values->>'duplicate_case_id' FROM "
                "public.machine_identity_events WHERE machine_id = %s "
                "AND event_type = 'duplicate_case_opened' "
                "AND visibility = 'staff_only';", (rb["machine_id"],))
    case_row = cur.fetchone()
    case_id = case_row[0] if case_row else None
    cur.execute("SELECT COUNT(*) FROM public.machine_duplicate_cases "
                "WHERE id = %s::uuid AND status = 'open';", (case_id,))
    open_n = cur.fetchone()[0] if case_id else 0
    ck.record("S8_duplicate_case_audited",
              case_id is not None and open_n == 1,
              f"case={case_id}")
    c.close()


SEED_M1 = "c2000000-0000-4000-8000-000000000001"
SEED_M2 = "c2000000-0000-4000-8000-000000000002"
SEED_T1 = "d2000000-0000-4000-8000-000000000001"
SEED_T2 = "d2000000-0000-4000-8000-000000000002"


def seed_prod_pre(cur) -> None:
    cur.execute("INSERT INTO auth.users(id) VALUES (%s) ON CONFLICT DO NOTHING;",
                (OWNER_A,))
    cur.execute("INSERT INTO public.machines(id, name, model, serial_number,"
                " owner_id, installation_date) VALUES "
                "(%s, 'Seed Press', 'SP-7', 'SP7-1100', %s, '2024-03-01'), "
                "(%s, 'Seed Mill', 'SM-2', 'SM2-2200', %s, NULL);",
                (SEED_M1, OWNER_A, SEED_M2, OWNER_A))
    cur.execute("INSERT INTO public.service_tickets(id, ticket_number, user_id,"
                " title, status, machine_id) VALUES "
                "(%s, 'SPK-SEED-1', %s, 't', 'open', %s), "
                "(%s, 'SPK-SEED-2', %s, 't', 'open', NULL);",
                (SEED_T1, OWNER_A, SEED_M1, SEED_T2, OWNER_A))


def seed_staging_pre(cur) -> None:
    cur.execute("INSERT INTO auth.users(id) VALUES (%s) ON CONFLICT DO NOTHING;",
                (OWNER_A,))
    cur.execute("INSERT INTO public.service_tickets(id, ticket_number, user_id,"
                " title, status) VALUES "
                "(%s, 'SPK-SEED-1', %s, 't', 'open'), "
                "(%s, 'SPK-SEED-2', %s, 't', 'open');",
                (SEED_T1, OWNER_A, SEED_T2, OWNER_A))


def test_baseline_prod(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    cur.execute("SELECT COUNT(*) FROM public.machines WHERE id IN (%s, %s);",
                (SEED_M1, SEED_M2))
    ck.record("S9_prod_rows_kept", cur.fetchone()[0] == 2, "2 seed machines")
    cur.execute("SELECT serial_number, serial_number_raw, serial_canonical,"
                " identity_confidence, installation_date, legacy_gaps "
                "FROM public.machines WHERE id = %s;", (SEED_M1,))
    r = cur.fetchone()
    ck.record("S9_prod_backfill",
              r[0] == "SP7-1100" and r[1] == "SP7-1100" and r[2] == "SP7-1100"
              and r[3] == "legacy_incomplete" and str(r[4]) == "2024-03-01"
              and "brand_unknown" in json.dumps(r[5])
              and "catalog_unlinked" in json.dumps(r[5])
              and "installation_date_unknown" not in json.dumps(r[5]),
              f"canon={r[2]} conf={r[3]} gaps={json.dumps(r[5])}")
    cur.execute("SELECT machine_id FROM public.service_tickets WHERE id = %s;",
                (SEED_T1,))
    ck.record("S9_prod_link_kept", str(cur.fetchone()[0]) == SEED_M1,
              "ticket->machine FK intact")
    cur.execute("SELECT COUNT(*) FROM pg_constraint "
                "WHERE conname = 'machines_serial_number_key';")
    ck.record("S9_prod_unique_dropped", cur.fetchone()[0] == 0,
              "UNIQUE(serial_number) gone")
    cur.execute("INSERT INTO public.machines(name, model, serial_number,"
                " owner_id) VALUES ('null-ok', 'NX', NULL, %s) RETURNING id;",
                (OWNER_A,))
    tmp = cur.fetchone()[0]
    cur.execute("DELETE FROM public.machines WHERE id = %s;", (tmp,))
    ck.record("S9_prod_null_serial_allowed", True, "NULL insert ok + cleaned")
    # Recovery note: with duplicate serials present, UNIQUE cannot be restored
    # without human remediation (constraint build fails; nothing auto-deleted).
    cur.execute("INSERT INTO public.machines(name, model, serial_number,"
                " owner_id) VALUES ('dup-a', 'DX', 'DUPX-1', %s), "
                "('dup-b', 'DX', 'DUPX-1', %s);", (OWNER_A, OWNER_A))
    try:
        cur.execute("ALTER TABLE public.machines ADD CONSTRAINT "
                    "spark_tmp_re_unique UNIQUE (serial_number);")
        ck.record("S9_recovery_unique_blocked", False, "UNIQUE re-added?!")
        cur.execute("ALTER TABLE public.machines DROP CONSTRAINT "
                    "spark_tmp_re_unique;")
    except psycopg2.Error as e:
        ck.record("S9_recovery_unique_blocked", e.pgcode == "23505",
                  f"re-add rejected {e.pgcode}; rows kept, no silent fix")
    cur.execute("DELETE FROM public.machines WHERE serial_number = 'DUPX-1';")
    c.close()


def test_baseline_staging(db: str, ck: Checks) -> None:
    c = admin_conn(db)
    cur = c.cursor()
    cur.execute("SELECT COUNT(*) FROM public.service_tickets WHERE id IN (%s, %s);",
                (SEED_T1, SEED_T2))
    ck.record("S9_staging_tickets_kept", cur.fetchone()[0] == 2, "2 tickets")
    cur.execute("SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_name = 'service_tickets' AND column_name = 'machine_id';")
    ck.record("S9_staging_machine_id_added", cur.fetchone()[0] == 1,
              "machine_id converged")
    cur.execute("SELECT COUNT(*) FROM public.machines;")
    ck.record("S9_staging_registry_created", cur.fetchone()[0] == 0,
              "empty registry ready")
    r = register(cur, OWNER_A, "First", "F-1", "F1-001",
                 key="spark-first-staging")
    ck.record("S9_staging_register_smoke", bool(r.get("machine_id")),
              f'{r.get("machine_id")}')
    c.close()


def run_shape(shape: str, base_sql: str, seed_fn, baseline_fn) -> dict:
    db = f"spark_mi_pr1_{shape}"
    fresh_db(db)
    c = admin_conn(db)
    cur = c.cursor()
    cur.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")
    cur.execute(base_sql)
    seed_fn(cur)
    c.close()
    apply_migration(db)
    c = admin_conn(db)
    seed_users(c.cursor())
    c.close()
    ck = Checks()
    baseline_fn(db, ck)
    test_concurrency(db, ck)
    test_idempotency(db, ck)
    test_duplicates(db, ck)
    test_nondisclosure(db, ck)
    test_serial_catalog(db, ck)
    test_linking(db, ck)
    test_linking_tech(db, ck)
    test_edits(db, ck)
    test_pr1_audit_completeness(db, ck)
    return {"checks": ck.rows, "fail": ck.fails()}


def main() -> int:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    results = {
        "prod_shaped": run_shape("prod", PROD_BASE, seed_prod_pre,
                                 test_baseline_prod),
        "staging_shaped": run_shape("staging", STAGING_BASE, seed_staging_pre,
                                    test_baseline_staging),
    }
    OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
    total_fail = sum(len(v["fail"]) for v in results.values())
    total = sum(len(v["checks"]) for v in results.values())
    print(f"SPARK PR1: {total - total_fail}/{total} PASS; "
          f"failures: {[f for v in results.values() for f in v['fail']]}")
    print("wrote", OUT)
    return 0 if total_fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())



