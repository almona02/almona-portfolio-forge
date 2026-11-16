#!/usr/bin/env python3
"""FR-1 local rehearsal: Storage object pull (list + download only).

Uses prod_service_role.txt — privileged JWT, NOT a read-only key.
Allowed operations: Storage list + download into local private buckets.
Forbidden: upload, update, delete, bucket create/update on production.
Never logs the JWT.
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

try:
    import urllib.error
    import urllib.request
except ImportError:  # pragma: no cover
    raise SystemExit("urllib required")

SECURE = Path(
    os.environ.get(
        "FR1_REHEARSAL_SECURE",
        r"C:\Users\bobbi\AppData\Local\Cursor\AgentStores\cursor_agent_stores\u294861541\files\slice0\fr1-rehearsal",
    )
)
ART = Path(__file__).resolve().parents[2] / ".artifacts" / "fr1-rc" / "rehearsal"
BUCKETS = ("ticket-attachments", "machine-photos", "profile-thumbnails")
PROD_API = "https://shfsebdncjnncqqnewfj.supabase.co"


def _token() -> str:
    p = SECURE / "prod_service_role.txt"
    if not p.is_file():
        raise SystemExit("missing prod_service_role.txt in drop-slot")
    t = p.read_text(encoding="utf-8").strip()
    if not t or t == "[SENSITIVE]" or len(t) < 40:
        raise SystemExit("prod_service_role.txt unusable")
    return t


def _get(url: str, token: str) -> bytes:
    req = urllib.request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": token,
        },
        method="GET",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def main() -> int:
    ART.mkdir(parents=True, exist_ok=True)
    out_dir = SECURE / "storage-bytes"
    out_dir.mkdir(exist_ok=True)
    token = _token()
    summary = {"api": PROD_API, "buckets": {}, "mutations": "none", "ops": ["list", "download"]}
    for bucket in BUCKETS:
        # List (GET). No POST/DELETE.
        list_url = f"{PROD_API}/storage/v1/object/list/{bucket}"
        # Storage list API expects POST with body in some versions — use GET list via
        # `/object/list` POST is the current API. Prefer documented list with POST body
        # empty prefix — still not a mutation of objects.
        body = json.dumps({"prefix": "", "limit": 1000, "offset": 0}).encode()
        req = urllib.request.Request(
            list_url,
            data=body,
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": token,
                "Content-Type": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                entries = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            summary["buckets"][bucket] = {"error": e.code, "count": 0}
            continue
        names = []
        for ent in entries if isinstance(entries, list) else []:
            name = ent.get("name")
            if not name or ent.get("id") is None and ent.get("metadata") is None and name.endswith("/"):
                # skip folder placeholders when possible
                pass
            if name and not str(name).endswith("/"):
                names.append(name)
        pulled = 0
        bdir = out_dir / bucket
        bdir.mkdir(exist_ok=True)
        for name in names:
            dl = f"{PROD_API}/storage/v1/object/{bucket}/{name}"
            try:
                data = _get(dl, token)
            except urllib.error.HTTPError:
                continue
            dest = bdir / name.replace("/", "__")
            dest.write_bytes(data)
            pulled += 1
        summary["buckets"][bucket] = {"listed": len(names), "downloaded": pulled}
    manifest = ART / "storage-pull-summary.json"
    manifest.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    digest = hashlib.sha256(manifest.read_bytes()).hexdigest()[:16]
    print(f"storage_pull_ok summary_sha16={digest} (see .artifacts/fr1-rc/rehearsal/storage-pull-summary.json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
