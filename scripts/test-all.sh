#!/usr/bin/env bash
#
# Everything that can run without a running app: backend tests (including the migration test
# against a throwaway PostgreSQL container), frontend typecheck, frontend unit tests, and the
# production build. This is what CI runs.
#
# The end-to-end suites need a live stack and are separate — see TESTING.md:
#   DB_NAME=dashboard_scratch PORT=8081 FRONTEND_PORT=3002 scripts/dev-up.sh
#   API_URL=http://localhost:8081 scripts/api-smoke-test.sh
#   APP_URL=http://localhost:3002 API_URL=http://localhost:8081 npm --prefix frontend run test:e2e
set -uo pipefail

cd "$(dirname "$0")/.."

failures=()
run() {
  local label=$1
  shift
  printf '\n\033[1m%s\033[0m\n' "$label"
  "$@" || failures+=("$label")
}

run "Backend tests"            ./mvnw -q test
run "Frontend typecheck"       npm --prefix frontend run typecheck
run "Frontend unit tests"      npm --prefix frontend run test
run "Frontend build"           npm --prefix frontend run build

echo
if [ ${#failures[@]} -eq 0 ]; then
  echo "All green."
else
  printf 'FAILED: %s\n' "${failures[@]}"
  exit 1
fi
