#!/usr/bin/env python3
"""Provision one Auth user + profiles row for Lane A local stack."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

API = os.environ["LANE_A_API_URL"]
SERVICE = os.environ["LANE_A_SERVICE_KEY"]
DB_URL = os.environ["LANE_A_DB_URL"]
email, password, role, name = sys.argv[1:5]


def req(method: str, path: str, body: dict | None = None) -> tuple[int, dict | list]:
    data = None if body is None else json.dumps(body).encode()
    r = urllib.request.Request(
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
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode() or "{}"
            return resp.status, json.loads(raw)
    except urllib.error.HTTPError as e:
        raw = e.read().decode() or "{}"
        try:
            parsed: dict | list = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"message": raw}
        return e.code, parsed


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
user_id = None
if isinstance(created, dict):
    user_id = created.get("id")
if not user_id:
    st, listing = req("GET", "/auth/v1/admin/users?page=1&per_page=200")
    users = listing.get("users") if isinstance(listing, dict) else listing
    for u in users or []:
        if u.get("email") == email:
            user_id = u["id"]
            break
if not user_id:
    raise SystemExit(f"provision failed for {email}: {status} {created}")

import subprocess

subprocess.run(
    [
        "psql",
        DB_URL,
        "-v",
        "ON_ERROR_STOP=1",
        "-c",
        (
            "INSERT INTO public.profiles (id, role, email, full_name) "
            f"VALUES ('{user_id}', '{role}', '{email}', '{name}') "
            "ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, "
            "email = EXCLUDED.email, full_name = EXCLUDED.full_name;"
        ),
    ],
    check=True,
)
print(f"{email}|{role}|{user_id}")
