#!/usr/bin/env bash
# Isolated full-stack checklist browser: GoTrue + PostgREST + Postgres + Vite env.
# Bound to correction e27f21a530fe0eb122ab7886eb8a7854f066a896.
# Does not apply anything to staging or production. Does not print secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKDIR="$ROOT/scripts/service-workflow/lane-c-checklist-supabase"
ART="$ROOT/.artifacts/lane-c-checklist-browser"
CORRECTION_SHA="e27f21a530fe0eb122ab7886eb8a7854f066a896"
MIGRATION="$ROOT/supabase/migrations/20261118140000_service_routines_lane_c_checklist_history_reader.sql"
EXPECTED_MIGRATION_SHA256="ed93cd16831987e9f89f3dad7b8b018dc83464cc6c06427e24fe7837324fdf1d"

API_PORT=54431
DB_PORT=54432
APP_PORT=3012

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

git -C "$ROOT" merge-base --is-ancestor "$CORRECTION_SHA" HEAD
ACTUAL_SHA256="$("$PYTHON" -c "import hashlib,pathlib,sys; print(hashlib.sha256(pathlib.Path(sys.argv[1]).read_bytes()).hexdigest())" "$MIGRATION")"
if [[ "$ACTUAL_SHA256" != "$EXPECTED_MIGRATION_SHA256" ]]; then
  echo "Migration hash mismatch: $ACTUAL_SHA256" >&2
  exit 1
fi

mkdir -p "$ART"
HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD)"

echo "=== Starting isolated Lane C checklist Supabase ==="
mkdir -p "$ART"
supabase start --workdir "$WORKDIR" --exclude edge-runtime,logflare,vector,imgproxy >"$ART/supabase_start.log" 2>&1

STATUS_JSON="$(supabase status --workdir "$WORKDIR" -o json)"
printf '%s\n' "$STATUS_JSON" > "$ART/supabase_status.json"
API_URL="$("$PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["API_URL"])' <<<"$STATUS_JSON")"
DB_URL="$("$PYTHON" -c 'import json,sys; print(json.load(sys.stdin)["DB_URL"])' <<<"$STATUS_JSON")"
ANON_KEY="$("$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); print(d.get("ANON_KEY") or d.get("PUBLISHABLE_KEY") or "")' <<<"$STATUS_JSON")"
SERVICE_KEY="$("$PYTHON" -c 'import json,sys; d=json.load(sys.stdin); print(d.get("SERVICE_ROLE_KEY") or d.get("SECRET_KEY") or "")' <<<"$STATUS_JSON")"

case "$API_URL" in
  http://127.0.0.1:${API_PORT}|http://localhost:${API_PORT}) ;;
  *) echo "Refusing non-loopback or unexpected API_URL" >&2; exit 1 ;;
esac
if [[ -z "$ANON_KEY" || -z "$SERVICE_KEY" ]]; then
  echo "Supabase status did not include local API keys" >&2
  exit 1
fi

apply() {
  echo "=== Applying $1 ==="
  psql "$DB_URL" -v ON_ERROR_STOP=1 -f "$2"
}

READER_READY="$(psql "$DB_URL" -Atc "SELECT to_regprocedure('admin_private.can_read_checklist_attempt_history(uuid,uuid,uuid)') IS NOT NULL")"
if [[ "$READER_READY" == "t" ]]; then
  echo "Schema already present. Stop the stack with --no-backup before a clean re-apply." >&2
  exit 1
fi

apply "prelude" "$ROOT/scripts/service-workflow/lane_c_browser_prelude.sql"
apply "deps (staging-eq ticket RLS)" "$ROOT/scripts/service-workflow/disposable_lane_c_deps.sql"
apply "ui columns" "$ROOT/scripts/service-workflow/lane_c_browser_ui_columns.sql"
apply "lane A" "$ROOT/supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"
apply "stg-01" "$ROOT/supabase/migrations/20261116213000_service_routines_lane_a_stg01_stale_conflict.sql"
apply "lane B" "$ROOT/supabase/migrations/20261117190000_service_routines_lane_b_job_pins.sql"
apply "ticket header RLS" "$ROOT/supabase/migrations/20261118120000_service_tickets_rls_enable_and_tech_header.sql"
apply "lane C" "$ROOT/supabase/migrations/20261118130000_service_routines_lane_c_checklist_execution.sql"
apply "F-LC-VIS-1 reader" "$MIGRATION"
psql "$DB_URL" -v ON_ERROR_STOP=1 -c "NOTIFY pgrst, 'reload schema';"

export LANE_C_API_URL="$API_URL" LANE_C_SERVICE_KEY="$SERVICE_KEY" LANE_C_DB_URL="$DB_URL"

gen_pass() {
  "$PYTHON" -c "import secrets; print(secrets.token_urlsafe(18))"
}

PASS_ADMIN="${LANE_C_FIXTURE_PASS_ADMIN:-$(gen_pass)}"
PASS_SUPPORT="${LANE_C_FIXTURE_PASS_SUPPORT:-$(gen_pass)}"
PASS_TECH="${LANE_C_FIXTURE_PASS_TECH:-$(gen_pass)}"
PASS_TECH_OTHER="${LANE_C_FIXTURE_PASS_TECH_OTHER:-$(gen_pass)}"
PASS_OWNER="${LANE_C_FIXTURE_PASS_OWNER:-$(gen_pass)}"
PASS_OTHER="${LANE_C_FIXTURE_PASS_OTHER:-$(gen_pass)}"

provision() {
  "$PYTHON" "$ROOT/scripts/service-workflow/_lane_c_provision_user.py" "$1" "$2" "$3" "$4"
}

echo "=== Provisioning synthetic auth fixtures ==="
ADMIN_LINE="$(provision 'lanec.admin@local.test' "$PASS_ADMIN" admin 'Lane C Admin')"
SUPPORT_LINE="$(provision 'lanec.support@local.test' "$PASS_SUPPORT" support 'Lane C Support')"
TECH_LINE="$(provision 'lanec.tech.attending@local.test' "$PASS_TECH" technician 'Lane C Attending Tech')"
TECH_OTHER_LINE="$(provision 'lanec.tech.other@local.test' "$PASS_TECH_OTHER" technician 'Lane C Other Tech')"
OWNER_LINE="$(provision 'lanec.customer.owner@local.test' "$PASS_OWNER" customer 'Lane C Owning Customer')"
OTHER_LINE="$(provision 'lanec.customer.other@local.test' "$PASS_OTHER" customer 'Lane C Other Customer')"

field() { printf '%s\n' "$1" | awk -F'|' '/@local.test/ { id=$3 } END { print id }'; }
ADMIN_ID="$(field "$ADMIN_LINE")"
SUPPORT_ID="$(field "$SUPPORT_LINE")"
TECH_ID="$(field "$TECH_LINE")"
OWNER_ID="$(field "$OWNER_LINE")"

echo "=== Seeding checklist journey ==="
psql "$DB_URL" -v ON_ERROR_STOP=1 \
  -v admin_id="$ADMIN_ID" \
  -v support_id="$SUPPORT_ID" \
  -v tech_id="$TECH_ID" \
  -v owner_id="$OWNER_ID" \
  -f "$ROOT/scripts/service-workflow/lane_c_browser_seed.sql"

VISIT_ID="$(psql "$DB_URL" -Atc "SELECT v.id FROM public.service_job_visits v JOIN public.service_jobs j ON j.id = v.job_id JOIN public.service_tickets t ON t.id = j.ticket_id WHERE t.ticket_number = 'T-LC-BROWSER'")"
JOB_ID="$(psql "$DB_URL" -Atc "SELECT j.id FROM public.service_jobs j JOIN public.service_tickets t ON t.id = j.ticket_id WHERE t.ticket_number = 'T-LC-BROWSER'")"
TICKET_ID="$(psql "$DB_URL" -Atc "SELECT id FROM public.service_tickets WHERE ticket_number = 'T-LC-BROWSER'")"
POLICY="$(psql "$DB_URL" -Atc "SELECT pg_get_expr(polqual, polrelid) FROM pg_policy WHERE polrelid = 'public.service_visit_checklist_answer_history'::regclass AND polcmd = 'r'")"
RLS="$(psql "$DB_URL" -Atc "SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'service_tickets'")"

umask 077
cat > "$ART/FIXTURES_ACCESS.txt" <<EOF
# Local synthetic fixtures only. Do not commit. Do not use on staging or production.
# Correction SHA: $CORRECTION_SHA
# HEAD: $HEAD_SHA

API_URL=$API_URL
APP_URL=http://127.0.0.1:${APP_PORT}
VISIT_ID=$VISIT_ID
JOB_ID=$JOB_ID
TICKET_ID=$TICKET_ID

lanec.admin@local.test|$PASS_ADMIN|$ADMIN_ID
lanec.support@local.test|$PASS_SUPPORT|$SUPPORT_ID
lanec.tech.attending@local.test|$PASS_TECH|$TECH_ID
lanec.tech.other@local.test|$PASS_TECH_OTHER|$(field "$TECH_OTHER_LINE")
lanec.customer.owner@local.test|$PASS_OWNER|$OWNER_ID
lanec.customer.other@local.test|$PASS_OTHER|$(field "$OTHER_LINE")
EOF

cat > "$ROOT/.env.lane-c.local" <<EOF
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
  "correction_sha": "$CORRECTION_SHA",
  "head_sha": "$HEAD_SHA",
  "migration": "supabase/migrations/20261118140000_service_routines_lane_c_checklist_history_reader.sql",
  "migration_sha256": "$EXPECTED_MIGRATION_SHA256",
  "project_id": "almona-lane-c-checklist-local",
  "api_url": "$API_URL",
  "db_port": $DB_PORT,
  "studio_url": "http://127.0.0.1:54433",
  "mailpit_url": "http://127.0.0.1:54434",
  "app_url": "http://127.0.0.1:$APP_PORT",
  "vite_mode": "lane-c",
  "vite_env_file": ".env.lane-c.local",
  "ticket_rls_enabled": "$RLS" == "t",
  "history_select_policy": """$POLICY""",
  "visit_id": "$VISIT_ID",
  "job_id": "$JOB_ID",
  "ticket_id": "$TICKET_ID",
  "fixtures": [
    {"email": "lanec.admin@local.test", "role": "admin"},
    {"email": "lanec.support@local.test", "role": "support"},
    {"email": "lanec.tech.attending@local.test", "role": "technician", "relation": "assignee and attending"},
    {"email": "lanec.tech.other@local.test", "role": "technician", "relation": "unrelated"},
    {"email": "lanec.customer.owner@local.test", "role": "customer", "relation": "ticket owner"},
    {"email": "lanec.customer.other@local.test", "role": "customer", "relation": "unrelated"},
  ],
  "secrets_file": ".artifacts/lane-c-checklist-browser/FIXTURES_ACCESS.txt",
  "not_staging": True,
  "not_production": True,
  "not_fr1": True,
}
open(os.path.join(art, "environment.json"), "w", encoding="utf-8").write(json.dumps(payload, indent=2))
print("environment.json written (no secrets)")
print("visit_id=$VISIT_ID")
PY

echo "=== Frontend ==="
echo "npm run dev -- --host 127.0.0.1 --port ${APP_PORT} --mode lane-c"
echo "Then: python scripts/service-workflow/lane_c_checklist_browser_journey.py"
