#!/usr/bin/env bash
# Bootstrap isolated Lane A Supabase (Auth/API/Storage) for runtime e1345a0a.
# Synthetic fixtures only. Separate from FR-1 / default local project.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKDIR="$ROOT/scripts/service-workflow/lane-a-supabase"
ART="$ROOT/.artifacts/lane-a-local"
MIG="$ROOT/supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
DEPS="$ROOT/scripts/service-workflow/lane_a_local_deps.sql"
RUNTIME_SHA="${LANE_A_RUNTIME_SHA:-e1345a0aef857e857fe5af50176c1fcb633aae70}"

API_PORT=54421
DB_PORT=54422
STUDIO_PORT=54423
MAIL_PORT=54424
APP_PORT=3000

FIXTURE_PASS_ADMIN="${LANE_A_FIXTURE_PASS_ADMIN:-LaneA-Admin-Local-Only-9kQx!}"
FIXTURE_PASS_SUPPORT="${LANE_A_FIXTURE_PASS_SUPPORT:-LaneA-Support-Local-Only-9kQx!}"
FIXTURE_PASS_TECH="${LANE_A_FIXTURE_PASS_TECH:-LaneA-Tech-Local-Only-9kQx!}"
FIXTURE_PASS_CUSTOMER="${LANE_A_FIXTURE_PASS_CUSTOMER:-LaneA-Customer-Local-Only-9kQx!}"

mkdir -p "$ART"
if ! docker info >/dev/null 2>&1; then
  echo "Docker engine not reachable" >&2
  exit 1
fi

echo "=== Starting isolated Lane A Supabase (project almona-lane-a-local) ==="
supabase start --workdir "$WORKDIR" --exclude edge-runtime,logflare,vector,imgproxy

STATUS_JSON="$(supabase status --workdir "$WORKDIR" -o json)"
echo "$STATUS_JSON" > "$ART/supabase_status.json"

API_URL="$(python -c 'import json,sys; print(json.load(sys.stdin)["API_URL"])' <<<"$STATUS_JSON")"
DB_URL="$(python -c 'import json,sys; print(json.load(sys.stdin)["DB_URL"])' <<<"$STATUS_JSON")"
ANON_KEY="$(python -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ANON_KEY") or d.get("PUBLISHABLE_KEY"))' <<<"$STATUS_JSON")"
SERVICE_KEY="$(python -c 'import json,sys; d=json.load(sys.stdin); print(d.get("SERVICE_ROLE_KEY") or d.get("SECRET_KEY"))' <<<"$STATUS_JSON")"

case "$API_URL" in
  http://127.0.0.1:*|http://localhost:*) ;;
  *) echo "Refusing non-loopback API_URL=$API_URL" >&2; exit 1 ;;
esac

echo "=== Applying dependency chain + Lane A migration ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$DEPS"
psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$MIG"

export LANE_A_API_URL="$API_URL" LANE_A_SERVICE_KEY="$SERVICE_KEY" LANE_A_DB_URL="$DB_URL"
create_user() {
  python "$ROOT/scripts/service-workflow/_lane_a_provision_user.py" "$1" "$2" "$3" "$4"
}

echo "=== Provisioning synthetic fixtures ==="
ADMIN_LINE="$(create_user 'lanea.admin.author@local.test' "$FIXTURE_PASS_ADMIN" admin 'Lane A Admin Author')"
SUPPORT_LINE="$(create_user 'lanea.support.reviewer@local.test' "$FIXTURE_PASS_SUPPORT" support 'Lane A Support Reviewer')"
TECH_LINE="$(create_user 'lanea.tech.denied@local.test' "$FIXTURE_PASS_TECH" technician 'Lane A Tech Denied')"
CUST_LINE="$(create_user 'lanea.customer.denied@local.test' "$FIXTURE_PASS_CUSTOMER" customer 'Lane A Customer Denied')"

# Secure fixture access file (gitignored via .artifacts/)
umask 077
cat > "$ART/FIXTURES_ACCESS.txt" <<EOF
# Lane A local synthetic fixtures — LOCAL ONLY. Do not commit. Do not use on staging/prod.
# Runtime SHA: $RUNTIME_SHA
# Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)

API_URL=$API_URL
DB_URL=postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres
STUDIO_URL=http://127.0.0.1:${STUDIO_PORT}
MAILPIT_URL=http://127.0.0.1:${MAIL_PORT}
ANON_KEY=$ANON_KEY
# SERVICE_ROLE_KEY is local-demo only; never ship to browser.
SERVICE_ROLE_KEY=$SERVICE_KEY

Admin author:    lanea.admin.author@local.test / (see LANE_A_FIXTURE_PASS_ADMIN or default in bootstrap)
  $ADMIN_LINE
Support reviewer: lanea.support.reviewer@local.test
  $SUPPORT_LINE
Technician (denied /support/routines + drafts): lanea.tech.denied@local.test
  $TECH_LINE
Customer (denied): lanea.customer.denied@local.test
  $CUST_LINE

Passwords (rotate by re-running with LANE_A_FIXTURE_PASS_* env overrides):
ADMIN=$FIXTURE_PASS_ADMIN
SUPPORT=$FIXTURE_PASS_SUPPORT
TECH=$FIXTURE_PASS_TECH
CUSTOMER=$FIXTURE_PASS_CUSTOMER

UI entry points (frontend on http://127.0.0.1:${APP_PORT}):
  Admin authoring: /admin?tab=service-routines
  Support review:  /support/routines
EOF

# Frontend bind (gitignored path preferred; also write example without secrets to docs)
cat > "$ART/.env.lane-a.local" <<EOF
# Generated for Lane A isolated local — do not commit; do not point at staging/prod
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
EOF

# Convenience copy for Vite if operator chooses (still under .artifacts)
cp "$ART/.env.lane-a.local" "$ROOT/.env.lane-a.local" 2>/dev/null || true

echo "=== Connectivity checks ==="
# Health
curl -sS -o /dev/null -w "rest_openapi:%{http_code}\n" "$API_URL/rest/v1/" -H "apikey: $ANON_KEY" || true

login() {
  local email="$1" pass="$2"
  curl -sS -X POST "$API_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "$(python -c "import json; print(json.dumps({'email':'$email','password':'''$pass'''}))")"
}

ADMIN_TOK="$(login 'lanea.admin.author@local.test' "$FIXTURE_PASS_ADMIN")"
SUPPORT_TOK="$(login 'lanea.support.reviewer@local.test' "$FIXTURE_PASS_SUPPORT")"
TECH_TOK="$(login 'lanea.tech.denied@local.test' "$FIXTURE_PASS_TECH")"

python - <<PY
import json, os, urllib.request
art = r"""$ART"""
api = r"""$API_URL"""
anon = r"""$ANON_KEY"""

def tok(raw, label):
    d = json.loads(raw)
    assert d.get("access_token"), f"{label} login failed: {d}"
    print(f"login_ok:{label}")
    return d["access_token"]

admin = tok("""$ADMIN_TOK""", "admin")
support = tok("""$SUPPORT_TOK""", "support")
tech = tok("""$TECH_TOK""", "technician")

def rpc(token, fn, payload):
    req = urllib.request.Request(
        f"{api}/rest/v1/rpc/{fn}",
        data=json.dumps(payload).encode(),
        headers={
            "apikey": anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode()

payload = {
  "p_code": "LA-LOCAL-BOOT-1",
  "p_name_en": "Local boot draft",
  "p_name_ar": "",
  "p_description": "",
  "p_payload": {
    "sections": [{
      "id": "safety", "kind": "safety", "title": "Safety",
      "items": [{
        "id": "g1", "type": "safety_gate", "requirement_class": "safety_gate",
        "instruction": "LOTO", "waivable": False, "evidence": "none"
      }]
    }]
  },
  "p_families": ["saw"],
  "p_actor_id": None,
}
st, body = rpc(admin, "create_service_routine_draft", payload)
print(f"admin_create_draft:{st}")
assert st in (200, 201), body
created = json.loads(body)
vid = created["version_id"]
st, body = rpc(admin, "submit_service_routine_for_review", {"p_version_id": vid, "p_actor_id": None})
print(f"admin_submit:{st}")
assert st in (200, 201), body
st, body = rpc(support, "record_service_routine_review", {"p_version_id": vid, "p_rationale": "local ok", "p_actor_id": None})
print(f"support_review:{st}")
assert st in (200, 201), body
st, body = rpc(tech, "get_service_routine_preview", {"p_version_id": vid, "p_actor_id": None})
print(f"tech_draft_preview_denied:{st}")
assert st >= 400, body
print("api_rpc_checks_ok")
from pathlib import Path
Path(r"""$ART""").joinpath("bootstrap_verify.json").write_text(json.dumps({
  "runtime_sha": """$RUNTIME_SHA""",
  "api_url": api,
  "checks": {"admin_create": True, "support_review": True, "tech_draft_denied": True},
  "constraint": "one_in_flight_draft_per_routine",
}, indent=2), encoding="utf-8")
PY

cat > "$ART/HANDOFF_PORTS.txt" <<EOF
runtime_sha=$RUNTIME_SHA
api=http://127.0.0.1:${API_PORT}
db=postgresql://postgres:postgres@127.0.0.1:${DB_PORT}/postgres
studio=http://127.0.0.1:${STUDIO_PORT}
mailpit=http://127.0.0.1:${MAIL_PORT}
frontend=http://127.0.0.1:${APP_PORT}
admin_ui=/admin?tab=service-routines
support_ui=/support/routines
env_file=.artifacts/lane-a-local/.env.lane-a.local
fixtures=.artifacts/lane-a-local/FIXTURES_ACCESS.txt
constraint=one_in_flight_draft_per_routine (implementation constraint; not concurrent-draft evidence)
EOF

echo "=== Bootstrap complete ==="
echo "Frontend bind: copy $ART/.env.lane-a.local to repo .env then npm run dev"
echo "Spark fixture access: $ART/FIXTURES_ACCESS.txt (gitignored)"
echo "Ports: $ART/HANDOFF_PORTS.txt"
