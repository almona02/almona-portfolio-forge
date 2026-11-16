#!/usr/bin/env bash
# Apply Lane A disposable base + migration + optional battery to docker-compose Postgres.
# Isolated local only — never staging/production.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE="$ROOT/scripts/service-workflow/docker-compose.lane-a-local.yml"
PGBIN="${PGBIN:-/c/Program Files/PostgreSQL/17/bin}"
PORT="${LANE_A_PG_PORT:-55458}"
CONN="host=127.0.0.1 port=${PORT} user=postgres password=lane_a_local_only dbname=routines_lane_a connect_timeout=5"
RUN_BATTERY="${1:-battery}"

if ! docker info >/dev/null 2>&1; then
  echo "Docker engine not reachable. Start Docker Desktop, then retry." >&2
  exit 1
fi

docker compose -f "$COMPOSE" up -d
echo "waiting for postgres on ${PORT}…"
for _ in $(seq 1 40); do
  if "$PGBIN/psql" "$CONN" -c "SELECT 1" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
"$PGBIN/psql" "$CONN" -c "SELECT 1" >/dev/null

echo "applying base…"
"$PGBIN/psql" "$CONN" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/service-workflow/disposable_routines_base.sql"
echo "applying Lane A migration…"
"$PGBIN/psql" "$CONN" -v ON_ERROR_STOP=1 -f "$ROOT/supabase/migrations/20261116180000_service_routines_lane_a_authoring.sql"

if [[ "$RUN_BATTERY" == "battery" ]]; then
  echo "running battery (Cursor evidence)…"
  "$PGBIN/psql" "$CONN" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/service-workflow/disposable_routines_battery.sql"
fi

echo "ok — docker Lane A Postgres ready on 127.0.0.1:${PORT} (db routines_lane_a)"
echo "Note: container is Postgres-only; Vite browser still needs disposable Supabase Auth/API (see SPARK_LANE_A_LOCAL_BROWSER.md Path B)."
