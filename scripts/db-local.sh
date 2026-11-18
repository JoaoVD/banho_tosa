#!/usr/bin/env bash
# Postgres 16 local que imita o Supabase (roles + auth.uid()).
# Uso: npm run db:local up|reset|down
set -euo pipefail
cd "$(dirname "$0")/.."
BIN="$(pg_config --bindir 2>/dev/null || true)"
[ -x "$BIN/initdb" ] || BIN=/usr/lib/postgresql/16/bin
DATA=.tmp/pg
PORT=54329
URL="postgres://postgres@localhost:$PORT/postgres"
RUN_AS=""
if [ "$(id -u)" = "0" ]; then RUN_AS="runuser -u postgres --"; fi

start() {
  mkdir -p .tmp
  if [ ! -d "$DATA" ]; then
    mkdir -p "$DATA"; [ -n "$RUN_AS" ] && chown -R postgres "$DATA" .tmp
    $RUN_AS "$BIN/initdb" -D "$DATA" -U postgres --auth=trust -E UTF8 --locale=C.UTF-8 >/dev/null
  fi
  if ! $RUN_AS "$BIN/pg_ctl" -D "$DATA" status >/dev/null 2>&1; then
    $RUN_AS "$BIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp" -l "$DATA/server.log" -w start >/dev/null
  fi
}
apply() {
  psql "$URL" -q -v ON_ERROR_STOP=1 -c "drop schema if exists public cascade; create schema public; grant usage on schema public to anon, authenticated, service_role;" 2>/dev/null || true
  psql "$URL" -q -v ON_ERROR_STOP=1 -c "set client_min_messages=warning" -f supabase/local/shim.sql
  psql "$URL" -q -v ON_ERROR_STOP=1 -c "grant usage on schema public to anon, authenticated, service_role;"
  for f in supabase/migrations/*.sql; do [ -e "$f" ] && psql "$URL" -q -v ON_ERROR_STOP=1 -f "$f"; done
  echo "DATABASE_URL=$URL"
}
case "${1:-up}" in
  up) start; if ! psql "$URL" -tAc "select 1 from pg_roles where rolname='authenticated'" | grep -q 1; then apply; else echo "DATABASE_URL=$URL"; fi ;;
  reset) start; apply ;;
  down) $RUN_AS "$BIN/pg_ctl" -D "$DATA" stop -m fast ;;
  *) echo "uso: db-local.sh up|reset|down"; exit 1 ;;
esac
