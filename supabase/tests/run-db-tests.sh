#!/usr/bin/env bash
# Database tests for Kinship: builds a throwaway Postgres, applies the
# Supabase stand-in and every migration in order, then runs the pgTAP suites.
#
# Usage: supabase/tests/run-db-tests.sh [--keep] [--fingerprint]
#   --fingerprint  print the schema fingerprint (to compare with production)
#
# Needs Postgres 16+ binaries, pgTAP and pg_prove. Works as a normal user or,
# in a container, as root (it then runs Postgres as the `postgres` user).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PORT="${PGPORT_TEST:-54329}"
FINGERPRINT=0
KEEP=0
for arg in "$@"; do
  case "$arg" in
    --fingerprint) FINGERPRINT=1 ;;
    --keep) KEEP=1 ;;
  esac
done

DATA="$(mktemp -d /tmp/kinship-pg.XXXXXX)"
RUNAS=()
if [ "$(id -u)" = "0" ]; then
  chown postgres "$DATA"
  RUNAS=(runuser -u postgres --)
fi

cleanup() {
  "${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -m immediate stop >/dev/null 2>&1 || true
  [ "$KEEP" = "1" ] || rm -rf "$DATA"
}
trap cleanup EXIT

"${RUNAS[@]}" "$PGBIN/initdb" -D "$DATA" -U postgres --auth=trust >/dev/null
"${RUNAS[@]}" "$PGBIN/pg_ctl" -D "$DATA" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DATA/log" -w start >/dev/null

PSQL=(env PGOPTIONS=--client-min-messages=warning psql -h /tmp -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -d postgres -c "CREATE DATABASE kinship_test" >/dev/null
"${PSQL[@]}" -d kinship_test -f "$ROOT/supabase/tests/bootstrap/supabase_stub.sql" >/dev/null

for f in $(ls "$ROOT"/supabase/migrations/*.sql | sort); do
  "${PSQL[@]}" -d kinship_test -f "$f" >/dev/null
done
echo "Applied $(ls "$ROOT"/supabase/migrations/*.sql | wc -l) migrations."

if [ "$FINGERPRINT" = "1" ]; then
  psql -h /tmp -p "$PORT" -U postgres -d kinship_test -X -A -t -f "$ROOT/supabase/tests/schema_fingerprint.sql"
  exit 0
fi

pg_prove -h /tmp -p "$PORT" -U postgres -d kinship_test --ext .sql -r "$ROOT/supabase/tests/database"
