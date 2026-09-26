#!/usr/bin/env bash
#
# Brings the stack up for manual testing: PostgreSQL and Redis in Docker, the backend, and the
# frontend pointed at it. Seeds demo accounts so there's something to look at on first load.
#
#   scripts/dev-up.sh              # dashboard_dev, backend :8080, frontend :3000
#   DB_NAME=dashboard_scratch PORT=8081 FRONTEND_PORT=3002 scripts/dev-up.sh
#   SEED=false scripts/dev-up.sh   # skip the demo data
#
# Logs go to .dev/backend.log and .dev/frontend.log. Stop everything with scripts/dev-down.sh.
set -euo pipefail

cd "$(dirname "$0")/.."

DB_NAME=${DB_NAME:-dashboard_dev}
PORT=${PORT:-8080}
FRONTEND_PORT=${FRONTEND_PORT:-3000}
SEED=${SEED:-true}
DEMO_PASSWORD=${DEMO_PASSWORD:-Password123!}

mkdir -p .dev

say() { printf '\n\033[1m%s\033[0m\n' "$1"; }

say "1/5  Postgres and Redis"
docker compose up -d
for _ in $(seq 1 30); do
  docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
docker compose exec -T postgres pg_isready -U postgres >/dev/null 2>&1 \
  || { echo "Postgres didn't come up — check 'docker compose logs postgres'." >&2; exit 1; }

if [ "$DB_NAME" != "dashboard_dev" ]; then
  docker compose exec -T postgres psql -U postgres -tc "select 1 from pg_database where datname = '$DB_NAME'" \
    | grep -q 1 || docker compose exec -T postgres createdb -U postgres "$DB_NAME"
fi
echo "     database: $DB_NAME"

say "2/5  Backend on :$PORT"
profiles=""
if [ "$SEED" = "true" ]; then profiles="demo"; fi

# The OAuth client registrations must exist for the context to build. Real sign-in with Google or
# LinkedIn needs real values — export them before running this if you're testing that path.
SPRING_PROFILES_ACTIVE="$profiles" \
DB_NAME="$DB_NAME" \
SERVER_PORT="$PORT" \
APP_DEMO_PASSWORD="$DEMO_PASSWORD" \
GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-unset}" \
GOOGLE_CLIENT_SECRET="${GOOGLE_CLIENT_SECRET:-unset}" \
LINKEDIN_CLIENT_ID="${LINKEDIN_CLIENT_ID:-unset}" \
LINKEDIN_CLIENT_SECRET="${LINKEDIN_CLIENT_SECRET:-unset}" \
  ./mvnw -q spring-boot:run -Dspring-boot.run.jvmArguments="-Dspring.devtools.restart.enabled=false" \
  > .dev/backend.log 2>&1 < /dev/null &
echo $! > .dev/backend.pid

# /api/auth/me answers 401 when signed out, which still means the server is up — so check for
# any HTTP response rather than a successful one.
answering() { [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 2 "$1")" != 000 ]; }

for _ in $(seq 1 90); do
  answering "http://localhost:$PORT/api/auth/me" && break
  sleep 1
done
answering "http://localhost:$PORT/api/auth/me" \
  || { echo "Backend didn't start — see .dev/backend.log" >&2; tail -30 .dev/backend.log >&2; exit 1; }

say "3/5  Frontend on :$FRONTEND_PORT"
# The subshell is backgrounded as a whole, so $! is the pid of the group to stop later.
( cd frontend && VITE_API_URL="http://localhost:$PORT" exec npx vite --port "$FRONTEND_PORT" --strictPort ) \
  > .dev/frontend.log 2>&1 < /dev/null &
echo $! > .dev/frontend.pid

for _ in $(seq 1 30); do
  answering "http://localhost:$FRONTEND_PORT" && break
  sleep 1
done

say "4/5  Ready"
echo "     app      http://localhost:$FRONTEND_PORT"
echo "     api      http://localhost:$PORT"
echo "     logs     .dev/backend.log  .dev/frontend.log"

say "5/5  Sign in"
if [ "$SEED" = "true" ]; then
  echo "     VC       owner@demo.dashboard.test      (also pm@ and staff@)"
  echo "     Startup  founder@demo.dashboard.test    (also cofounder@)"
  echo "     Password $DEMO_PASSWORD"
else
  echo "     No demo data (SEED=false). Register from the sign-in page."
fi
echo
echo "Stop everything with scripts/dev-down.sh"
