#!/usr/bin/env python3
"""Provision one GoTrue user + profiles row for the coverage UI browser stack."""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.error
import urllib.request

API = os.environ["COV_API_URL"]
SERVICE = os.environ["COV_SERVICE_KEY"]
DB_URL = os.environ["COV_DB_URL"]
email, password, role, name = sys.argv[1:5]


def req(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list]:
    data = None if body is None else json.dumps(body).encode()
    request = urllib.request.Request(
        f"{API}{path}",
        data=data,
        method=method,
        headers={
            "apikey": SERVICE,
            "Authorization": f"Bearer {SERVICE}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(request) as resp:
            raw = resp.read().decode() or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode() or "{}"
        try:
            parsed: dict | list = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"message": raw}
        return exc.code, parsed


status, created = req(
    "POST",
    "/auth/v1/admin/users",
    {
        "email": email,
        "password": password,
        "email_confirm": True,
        "user_metadata": {"full_name": name},
    },
)
user_id = created.get("id") if isinstance(created, dict) else None
if not user_id:
    _status, listing = req("GET", "/auth/v1/admin/users?page=1&per_page=200")
    users = listing.get("users") if isinstance(listing, dict) else listing
    for user in users or []:
        if user.get("email") == email:
            user_id = user.get("id")
            break
if not user_id:
    raise SystemExit(f"provision failed for {email}: {status}")

profile = subprocess.run(
    [
        "psql",
        DB_URL,
        "-v",
        "ON_ERROR_STOP=1",
        "-q",
        "-c",
        (
            "INSERT INTO public.profiles (id, role, email, full_name) "
            f"VALUES ('{user_id}', '{role}', '{email}', '{name}') "
            "ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, "
            "email = EXCLUDED.email, full_name = EXCLUDED.full_name;"
        ),
    ],
    check=False,
    capture_output=True,
    text=True,
)
if profile.returncode != 0:
    raise SystemExit(profile.stderr or profile.stdout)

print(f"{email}|provisioned|{user_id}")
