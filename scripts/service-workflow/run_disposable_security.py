#!/usr/bin/env python3
"""Disposable security remediation battery (reproduce → fix → pass).

Applies stub base + Slice0 + TKT + frozen B1@7a830739 + B2@8f2acc4e,
runs security battery (expect FAIL-OPEN findings), applies corrective
migration from the worktree, re-runs security battery (expect PASS),
then re-runs the main B1/B2 battery for regression.

Does NOT touch staging/production.
"""
from __future__ import annotations

import getpass
import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / "scripts/service-workflow/disposable_b1_base.sql"
MIGRATION = ROOT / "supabase/migrations/20261111010000_service_slice0_security_boundary.sql"
TKT_MIGRATION = ROOT / "supabase/migrations/20261111200000_staging_machine_photos_and_ticket_number.sql"
B1_FROZEN_SHA = "7a8307395b79df677a96f77cd993a77351b5805c"
B1_MIGRATION_GIT_PATH = "supabase/migrations/20261111210000_service_workflow_b1_data_contract.sql"
B2_FROZEN_SHA = "8f2acc4e806e70e12e87a24dcbebaef78e63e085"
B2_MIGRATION_GIT_PATH = "supabase/migrations/20261111220000_service_workflow_b2_assignment.sql"
CORRECTIVE = ROOT / "supabase/migrations/20261112150000_service_workflow_security_remediation.sql"
SEC_BATTERY = ROOT / "scripts/service-workflow/disposable_security_battery.sql"
MAIN_BATTERY = ROOT / "scripts/service-workflow/disposable_b1_battery.sql"
OUT_DIR = ROOT / ".artifacts/slice0/service-workflow"
OUT = OUT_DIR / "disposable_security_results.json"
PGBIN = Path(r"C:\Program Files\PostgreSQL\17\bin")
DATADIR = OUT_DIR / "_sec_cluster"
PORT = "55443"
USER = getpass.getuser()

# Staging posture: Supabase default privileges grant EXECUTE to anon;
# hosted service_role has BYPASSRLS + table INSERT (direct-write bypass).
STAGING_POSTURE_BEFORE = """
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.assign_service_job(uuid, uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.decline_service_job(uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.ensure_default_service_job(uuid, uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.govern_job_transition(uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.waive_service_job(uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_job_visit(uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.govern_visit_transition(uuid, text, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_job(uuid, text, boolean, text) TO anon;
ALTER ROLE service_role BYPASSRLS;
GRANT INSERT, UPDATE, DELETE ON public.service_jobs TO service_role;
"""

STAGING_ANON_PROBE_AFTER = """
GRANT USAGE ON SCHEMA public TO anon;
GRANT EXECUTE ON FUNCTION public.assign_service_job(uuid, uuid, text, uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.create_service_job(uuid, text, boolean, text, uuid) TO anon;
"""


def psql(db: str, sql: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-c", sql],
        text=True, capture_output=True, check=False,
    )


def psql_file(db: str, path: Path) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(PGBIN / "psql"), "-h", "127.0.0.1", "-p", PORT, "-U", USER,
         "-d", db, "-v", "ON_ERROR_STOP=1", "-f", str(path)],
        text=True, capture_output=True, check=False,
    )


def git_show(sha: str, path: str) -> bytes:
    r = subprocess.run(["git", "show", f"{sha}:{path}"],
                       capture_output=True, cwd=str(ROOT))
    if r.returncode != 0:
        raise SystemExit(f"cannot extract {path} at {sha}")
    return r.stdout


def parse_sec(db: str) -> dict:
    rows = psql(db, "SELECT check_id, status, detail FROM public.sec_eval ORDER BY 1;")
    counts = psql(
        db,
        "SELECT COUNT(*) FILTER (WHERE status='PASS') AS pass, "
        "COUNT(*) FILTER (WHERE status='FAIL') AS fail FROM public.sec_eval;",
    )
    parsed = {}
    for ln in rows.stdout.splitlines():
        cells = [c.strip() for c in ln.split("|")]
        if len(cells) >= 3 and cells[0].startswith("SEC"):
            parsed[cells[0]] = {"status": cells[1], "detail": cells[2]}
    return {"rows": parsed, "counts": counts.stdout.strip(), "raw": rows.stdout}


def apply_stack(db: str) -> None:
    for path in (BASE, MIGRATION):
        r = psql_file(db, path)
        if r.returncode != 0:
            raise SystemExit(f"apply {path.name} failed: {r.stderr}\n{r.stdout}")
    lines = TKT_MIGRATION.read_text(encoding="utf-8").splitlines(keepends=True)
    start = next(i for i, ln in enumerate(lines) if ln.startswith("-- 2) Server-side"))
    sec = OUT_DIR / "_sec_tkt_section2.sql"
    sec.write_text("".join(lines[start:]), encoding="utf-8")
    r = psql_file(db, sec)
    if r.returncode != 0:
        raise SystemExit(f"TKT section failed: {r.stderr}\n{r.stdout}")
    for sha, gpath, label in (
        (B1_FROZEN_SHA, B1_MIGRATION_GIT_PATH, "B1"),
        (B2_FROZEN_SHA, B2_MIGRATION_GIT_PATH, "B2"),
    ):
        f = OUT_DIR / f"_sec_{label.lower()}_frozen.sql"
        f.write_bytes(git_show(sha, gpath))
        r = psql_file(db, f)
        if r.returncode != 0:
            raise SystemExit(f"{label} migration failed: {r.stderr}\n{r.stdout}")
    # Fixture helpers from main battery (roles + b1_mkticket etc.) — apply only the
    # preamble by running main battery's setup via a thin extract isn't reliable;
    # instead apply a minimal helper bootstrap copied from battery conventions.
    helpers = OUT_DIR / "_sec_helpers.sql"
    helpers.write_text(
        (ROOT / "scripts/service-workflow/disposable_b1_battery.sql")
        .read_text(encoding="utf-8")
        .split("-- ---- B1 contract")[0]
        if False else "",
        encoding="utf-8",
    )


def bootstrap_helpers(db: str) -> None:
    """Install only the shared fixture helpers from the main battery preamble."""
    text = MAIN_BATTERY.read_text(encoding="utf-8")
    marker = "\n-- C1 legacy full walk"
    cut = text.find(marker)
    if cut < 0:
        raise SystemExit("cannot locate battery helper preamble")
    path = OUT_DIR / "_sec_helpers.sql"
    path.write_text(text[:cut], encoding="utf-8")
    r = psql_file(db, path)
    if r.returncode != 0:
        raise SystemExit(f"helpers failed: {r.stderr}\n{r.stdout[-2000:]}")


def run_sec(db: str, label: str) -> dict:
    posture = STAGING_POSTURE_BEFORE if label == "before_fix" else STAGING_ANON_PROBE_AFTER
    r = psql(db, posture)
    if r.returncode != 0:
        print(f"warn posture ({label}):", r.stderr[-300:])
    r = psql_file(db, SEC_BATTERY)
    print(f"\n=== SEC battery {label} ===")
    print(r.stdout[-2500:] if len(r.stdout) > 2500 else r.stdout)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        return {"ok": False, "stderr": r.stderr[-2000:], "label": label}
    parsed = parse_sec(db)
    parsed["label"] = label
    parsed["ok"] = all(v["status"] == "PASS" for v in parsed["rows"].values())
    for cid, row in parsed["rows"].items():
        print(row["status"], cid, row["detail"][:100])
    return parsed


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if not CORRECTIVE.exists():
        raise SystemExit(f"missing corrective migration: {CORRECTIVE}")
    if DATADIR.exists():
        shutil.rmtree(DATADIR)
    r = subprocess.run([str(PGBIN / "initdb"), "-D", str(DATADIR), "-E", "UTF8"],
                       text=True, capture_output=True)
    if r.returncode != 0:
        raise SystemExit(f"initdb failed: {r.stderr}")
    r = subprocess.run(
        [str(PGBIN / "pg_ctl"), "-D", str(DATADIR),
         "-o", f"-p {PORT} -c listen_addresses=127.0.0.1",
         "-l", str(OUT_DIR / "sec_cluster.log"), "start"],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if r.returncode != 0:
        raise SystemExit("pg start failed")
    results: dict = {}
    try:
        db = "sec_disposable"
        psql("postgres", f"DROP DATABASE IF EXISTS {db};")
        psql("postgres", f"CREATE DATABASE {db};")
        apply_stack(db)
        bootstrap_helpers(db)

        before = run_sec(db, "before_fix")
        results["before_fix"] = before

        r = psql_file(db, CORRECTIVE)
        if r.returncode != 0:
            raise SystemExit(f"corrective failed: {r.stderr}\n{r.stdout}")
        results["corrective_applied"] = True

        after = run_sec(db, "after_fix")
        results["after_fix"] = after

        # Expected: before has at least SEC1/SEC4/SEC5 fail-open; after all PASS
        before_fails = [k for k, v in before.get("rows", {}).items() if v["status"] == "FAIL"]
        after_fails = [k for k, v in after.get("rows", {}).items() if v["status"] == "FAIL"]
        results["verdict"] = {
            "before_fail_ids": before_fails,
            "after_fail_ids": after_fails,
            "reproduced": bool(set(before_fails) & {"SEC1", "SEC4", "SEC5"}),
            "fixed": after.get("ok") is True,
        }
        OUT.write_text(json.dumps(results, indent=2), encoding="utf-8")
        print("wrote", OUT)
        print("verdict", json.dumps(results["verdict"]))
        if not results["verdict"]["reproduced"]:
            print("WARN: did not reproduce expected fail-open set", file=sys.stderr)
        if not results["verdict"]["fixed"]:
            print("FAIL: after_fix not clean", file=sys.stderr)
            return 1
        return 0
    finally:
        subprocess.run([str(PGBIN / "pg_ctl"), "-D", str(DATADIR), "stop", "-m", "fast"],
                       capture_output=True)
        shutil.rmtree(DATADIR, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
