#!/usr/bin/env bash
#
# Stops what scripts/dev-up.sh started. Containers keep their volumes, so the database survives;
# pass --volumes to wipe Postgres and Redis data as well.
set -uo pipefail

cd "$(dirname "$0")/.."

for name in backend frontend; do
  pidfile=".dev/$name.pid"
  [ -f "$pidfile" ] || continue
  pid=$(cat "$pidfile")
  # Vite and spring-boot:run both fork, so stop the group rather than the launcher alone.
  if kill -0 "$pid" 2>/dev/null; then
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill -TERM "$pid" 2>/dev/null || true
    echo "stopped $name (pid $pid)"
  fi
  rm -f "$pidfile"
done

if [ "${1:-}" = "--volumes" ]; then
  docker compose down --volumes
  echo "containers and volumes removed — the database is gone"
else
  docker compose down
  echo "containers stopped; volumes kept"
fi
