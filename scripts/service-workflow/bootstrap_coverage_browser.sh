#!/usr/bin/env bash
# Isolated Auth/PostgREST/Postgres stack for the coverage UI journey.
# Environment work only — distinct from the F-COV-CAP-1 product correction.
# Does not apply to staging or production. Does not print secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKDIR="$ROOT/scripts/service-workflow/coverage-browser-supabase"
ART="$ROOT/.artifacts/coverage-browser"
MIG_BASE="$ROOT/supabase/migrations/20261118210000_service_coverage_recurrence.sql"
MIG_CAP="$ROOT/supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql"

API_PORT=54441
DB_PORT=54442
APP_PORT=3013

if ! command -v psql >/dev/null 2>&1; then
  if [[ -x "/c/Program Files/PostgreSQL/17/bin/psql.exe" ]]; then
    export PATH="/c/Program Files/PostgreSQL/17/bin:$PATH"
  elif [[ -x "/mnt/c/Program Files/PostgreSQL/17/bin/psql.exe" ]]; then
    export PATH="/mnt/c/Program Files/PostgreSQL/17/bin:$PATH"
  fi
fi

command -v docker >/dev/null 2>&1 || { echo "Docker is required" >&2; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "Supabase CLI is required" >&2; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "psql is required" >&2; exit 1; }
command -v python >/dev/null 2>&1 || command -v python3 >/dev/null 2>&1 || { echo "Python is required" >&2; exit 1; }
PYTHON="$(command -v python || command -v python3)"
docker info >/dev/null 2>&1 || { echo "Docker engine is not reachable" >&2; exit 1; }

mkdir -p "$ART"
HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD)"
CAP_SHA256="$("$PYTHON" -c "import hashlib,pathlib,sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes().replace(b'\r\n', b'\n')).hexdigest())" "$MIG_CAP")"

echo "=== Starting isolated coverage browser Supabase ==="
supabase start --workdir "$WORKDIR" --exclude edge-runtime,logflare,vector,imgproxy >"$ART/supabase_start.log" 2>&1

STATUS_JSON="$(supabase status --workdir "$WORKDIR" -o json)"
printf '%s\n' "$STATUS_JSON" > "$ART/supabase_status.json"
API_URL="$("$PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["API_URL"])' <<<"$STATUS_JSON")"
DB_URL="$("$PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["DB_URL"])' <<<"$STATUS_JSON")"
ANON_KEY="$("$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ANON_KEY") or d.get("PUBLISHABLE_KEY") or "")' <<<"$STATUS_JSON")"
SERVICE_KEY="$("$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); print(d.get("SERVICE_ROLE_KEY") or d.get("SECRET_KEY") or "")' <<<"$STATUS_JSON")"

case "$API_URL" in
  http://127.0.0.1:${API_PORT}|http://localhost:${API_PORT}) ;;
  *) echo "Refusing non-loopback or unexpected API_URL: $API_URL" >&2; exit 1 ;;
esac
if [[ -z "$ANON_KEY" || -z "$SERVICE_KEY" ]]; then
  echo "Supabase status did not include local API keys" >&2
  exit 1
fi

READY="$(psql "$DB_URL" -Atc "SELECT to_regprocedure('public.create_machine_coverage(uuid,uuid,date,date,integer,text,date,uuid)') IS NOT NULL")"
if [[ "$READY" == "t" ]]; then
  echo "Coverage schema already present. Stop with --no-backup before a clean re-apply." >&2
  exit 1
fi

apply() {
  echo "=== Applying $1 ==="
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$2"
}

apply "prelude" "$ROOT/scripts/service-workflow/coverage_browser_prelude.sql"
apply "lane-b deps shape" "$ROOT/scripts/service-workflow/disposable_lane_b_deps.sql"
apply "coverage deps" "$ROOT/scripts/service-workflow/disposable_coverage_deps.sql"
apply "lane A" "$ROOT/supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
apply "stg-01" "$ROOT/supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
apply "lane B" "$ROOT/supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
apply "coverage base" "$MIG_BASE"
apply "F-COV-CAP-1" "$MIG_CAP"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';"

export COV_API_URL="$API_URL" COV_SERVICE_KEY="$SERVICE_KEY" COV_DB_URL="$DB_URL"

gen_pass() { "$PYTHON" -c "import secrets; print(secrets.token_urlsafe(18))"; }

PASS_ADMIN="${COV_FIXTURE_PASS_ADMIN:-$(gen_pass)}"
PASS_SUPPORT="${COV_FIXTURE_PASS_SUPPORT:-$(gen_pass)}"
PASS_TECH="${COV_FIXTURE_PASS_TECH:-$(gen_pass)}"
PASS_OWNER="${COV_FIXTURE_PASS_OWNER:-$(gen_pass)}"
PASS_OTHER="${COV_FIXTURE_PASS_OTHER:-$(gen_pass)}"

provision() {
  "$PYTHON" "$ROOT/scripts/service-workflow/_coverage_provision_user.py" "$1" "$2" "$3" "$4"
}

echo "=== Provisioning synthetic auth fixtures ==="
ADMIN_LINE="$(provision 'coverage.admin@local.test' "$PASS_ADMIN" admin 'Coverage Admin')"
SUPPORT_LINE="$(provision 'coverage.support@local.test' "$PASS_SUPPORT" support 'Coverage Support')"
TECH_LINE="$(provision 'coverage.tech@local.test' "$PASS_TECH" technician 'Coverage Tech')"
OWNER_LINE="$(provision 'coverage.customer.owner@local.test' "$PASS_OWNER" customer 'Coverage Owner')"
OTHER_LINE="$(provision 'coverage.customer.other@local.test' "$PASS_OTHER" customer 'Coverage Other')"

field() { printf '%s\n' "$1" | awk -F'|' '/@local.test/ { id=$3 } END { print id }'; }
ADMIN_ID="$(field "$ADMIN_LINE")"
SUPPORT_ID="$(field "$SUPPORT_LINE")"
TECH_ID="$(field "$TECH_LINE")"
OWNER_ID="$(field "$OWNER_LINE")"

echo "=== Seeding coverage UI fixtures ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -v admin_id="$ADMIN_ID" \
  -v support_id="$SUPPORT_ID" \
  -v tech_id="$TECH_ID" \
  -v owner_id="$OWNER_ID" \
  -f "$ROOT/scripts/service-workflow/coverage_browser_seed.sql"

MACHINE_ID="$(psql "$DB_URL" -Atc "SELECT id FROM public.machines WHERE name = 'Coverage Browser Saw' LIMIT 1")"
VERSION_ID="$(psql "$DB_URL" -Atc "SELECT v.id FROM public.service_routine_versions v JOIN public.service_routines r ON r.id = v.routine_id WHERE r.code = 'COV-BROWSER' AND v.status = 'published' LIMIT 1")"
COVERAGE_ID="$(psql "$DB_URL" -Atc "SELECT id FROM public.service_machine_coverages ORDER BY created_at DESC LIMIT 1")"

umask 077
cat > "$ART/FIXTURES_ACCESS.txt" <<EOF
# Local synthetic fixtures only. Do not commit. Do not use on staging or production.
# HEAD: $HEAD_SHA
# F-COV-CAP-1 migration SHA-256: $CAP_SHA256

API_URL=$API_URL
APP_URL=http://127.0.0.1:${APP_PORT}
MACHINE_ID=$MACHINE_ID
VERSION_ID=$VERSION_ID
COVERAGE_ID=$COVERAGE_ID

coverage.admin@local.test|$PASS_ADMIN|$ADMIN_ID
coverage.support@local.test|$PASS_SUPPORT|$SUPPORT_ID
coverage.tech@local.test|$PASS_TECH|$TECH_ID
coverage.customer.owner@local.test|$PASS_OWNER|$OWNER_ID
coverage.customer.other@local.test|$PASS_OTHER|$(field "$OTHER_LINE")
EOF

cat > "$ROOT/.env.coverage.local" <<EOF
VITE_SUPABASE_URL=$API_URL
VITE_SUPABASE_ANON_KEY=$ANON_KEY
EOF

ART_PY="$ART"
if command -v cygpath >/dev/null 2>&1; then
  ART_PY="$(cygpath -w "$ART")"
fi
"$PYTHON" - <<PY
import json, os
art = r"""$ART_PY"""
payload = {
  "label": "coverage UI browser environment",
  "distinct_from_product_correction": True,
  "head_sha": "$HEAD_SHA",
  "f_cov_cap_1_migration": "supabase/migrations/20261118220000_service_coverage_f_cov_cap_1.sql",
  "f_cov_cap_1_sha256": "$CAP_SHA256",
  "project_id": "almona-coverage-browser-local",
  "api_url": "$API_URL",
  "db_port": $DB_PORT,
  "studio_url": "http://127.0.0.1:54443",
  "mailpit_url": "http://127.0.0.1:54444",
  "app_url": "http://127.0.0.1:$APP_PORT",
  "vite_mode": "coverage",
  "vite_env_file": ".env.coverage.local",
  "machine_id": "$MACHINE_ID",
  "routine_version_id": "$VERSION_ID",
  "coverage_id": "$COVERAGE_ID",
  "fixtures": [
    {"email": "coverage.admin@local.test", "role": "admin", "relation": "create/manage/generate"},
    {"email": "coverage.support@local.test", "role": "support", "relation": "create/manage/generate"},
    {"email": "coverage.tech@local.test", "role": "technician", "relation": "management denied"},
    {"email": "coverage.customer.owner@local.test", "role": "customer", "relation": "own-machine schedule only"},
    {"email": "coverage.customer.other@local.test", "role": "customer", "relation": "isolation"},
  ],
  "secrets_file": ".artifacts/coverage-browser/FIXTURES_ACCESS.txt",
  "not_staging": True,
  "not_production": True,
  "not_fr1": True,
  "not_merge": True,
}
open(os.path.join(art, "environment.json"), "w", encoding="utf-8").write(json.dumps(payload, indent=2))
print("environment.json written (no secrets)")
print("coverage_id=$COVERAGE_ID")
PY

echo "=== Frontend ==="
echo "npm run dev -- --host 127.0.0.1 --port ${APP_PORT} --mode coverage"
echo "python scripts/service-workflow/coverage_browser_journey.py"
echo "Stop: supabase stop --workdir scripts/service-workflow/coverage-browser-supabase --no-backup"
