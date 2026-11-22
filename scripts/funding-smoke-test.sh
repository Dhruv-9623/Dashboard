#!/usr/bin/env bash
#
# API smoke test for funding rounds and commitments, against a running backend.
#
# Covers the rules that only show up end to end: who may open a round, who may pledge against it,
# what one firm can see of another's commitment, and the ticket/currency guards.
#
# Registers fresh accounts each run, so it is safe to re-run — but it WRITES TO WHATEVER DATABASE
# THE API IS POINTED AT. Use a scratch database:
#
#   DB_NAME=dashboard_funding PORT=8081 scripts/dev-up.sh
#   API_URL=http://localhost:8081 DB_NAME=dashboard_funding scripts/funding-smoke-test.sh
#
# Pass DB_NAME and the run deletes its own records on the way out. Without it the fixtures stay
# in the database and show up in Discover as "Harbourline 1793533577" and friends, which is how
# they first turned up during manual testing.
#
# Exits non-zero if any check fails.
set -uo pipefail

B=${API_URL:-http://localhost:8081}
D=$(mktemp -d); TS=$(date +%s); PASS=0; FAIL=0

# Removes this run's records. Keyed on $TS, which every name and address it creates carries, so
# it cannot touch demo or hand-entered data. Only runs when told which database to clean.
cleanup() {
  rm -rf "$D"
  [ -n "${DB_NAME:-}" ] || return 0
  docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -q >/dev/null 2>&1 <<SQL
BEGIN;
CREATE TEMP TABLE s AS SELECT id FROM startups WHERE name LIKE '% $TS';
CREATE TEMP TABLE f AS SELECT id FROM vc_firms WHERE name LIKE '% $TS';
CREATE TEMP TABLE u AS SELECT id FROM users WHERE email LIKE '%-$TS@fund.test';
DELETE FROM commitment_events WHERE vc_firm_id IN (SELECT id FROM f)
   OR funding_cycle_id IN (SELECT id FROM funding_cycles WHERE startup_id IN (SELECT id FROM s));
DELETE FROM funding_commitments WHERE vc_firm_id IN (SELECT id FROM f)
   OR funding_cycle_id IN (SELECT id FROM funding_cycles WHERE startup_id IN (SELECT id FROM s));
DELETE FROM funding_cycles WHERE startup_id IN (SELECT id FROM s);
DELETE FROM investments WHERE vc_firm_id IN (SELECT id FROM f) OR startup_id IN (SELECT id FROM s);
DELETE FROM pool_entries WHERE vc_firm_id IN (SELECT id FROM f) OR startup_id IN (SELECT id FROM s);
DELETE FROM vc_firm_members WHERE firm_id IN (SELECT id FROM f) OR user_id IN (SELECT id FROM u);
DELETE FROM startup_members WHERE startup_id IN (SELECT id FROM s) OR user_id IN (SELECT id FROM u);
DELETE FROM startups WHERE id IN (SELECT id FROM s);
DELETE FROM vc_firms WHERE id IN (SELECT id FROM f);
DELETE FROM users WHERE id IN (SELECT id FROM u);
COMMIT;
SQL
  echo "Cleaned this run's records from $DB_NAME."
}
trap cleanup EXIT

if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$B/api/auth/me")" = 000 ]; then
  echo "No backend answering at $B — start it first (see scripts/dev-up.sh)." >&2
  exit 2
fi
echo "Testing $B"

check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf "  PASS  %-62s %s\n" "$1" "$3"
  else FAIL=$((FAIL+1)); printf "  FAIL  %-62s expected=%s got=%s\n" "$1" "$2" "$3"; fi
}
xsrf() { awk '$6=="XSRF-TOKEN"{print $7}' "$1" | tail -1; }
req() { local jar=$1 m=$2 p=$3 body=${4:-} tok; tok=$(xsrf "$jar")
  if [ -n "$body" ]; then curl -s -b "$jar" -c "$jar" -X "$m" -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $tok" -d "$body" -w '|%{http_code}' "$B$p"
  else curl -s -b "$jar" -c "$jar" -X "$m" -H "X-XSRF-TOKEN: $tok" -w '|%{http_code}' "$B$p"; fi; }
status() { echo "${1##*|}"; }
body() { echo "${1%|*}"; }
json() { echo "$1" | python3 -c "import sys,json
d=json.load(sys.stdin); v=d
for k in sys.argv[1].split('.'):
  if isinstance(v, list): v = v[int(k)] if k.isdigit() and int(k) < len(v) else None
  elif isinstance(v, dict): v = v.get(k)
  else: v = None
print('null' if v is None else (str(v).lower() if isinstance(v,bool) else v))" "$2" 2>/dev/null; }
account() { local jar=$D/$1; curl -s -c "$jar" -o /dev/null "$B/api/auth/me"
  req "$jar" POST /api/auth/register "{\"email\":\"$1-$TS@fund.test\",\"password\":\"secret123\"}" >/dev/null
  req "$jar" POST /api/auth/account-type "{\"userType\":\"$2\"}" >/dev/null; echo "$jar"; }

echo "== Setup: a founder with a startup, and two firms"
F=$(account founder STARTUP)
req "$F" POST /api/startups '{"name":"Harbourline '"$TS"'","sector":"Logistics","stage":"SERIES_A"}' >/dev/null
O=$(account owner VC); P=$(account pm VC); T=$(account staff VC); R=$(account rival VC)
r=$(req "$O" POST /api/vc/firms '{"name":"Meridian Fund '"$TS"'"}'); FIRM=$(json "$(body "$r")" data.id)
req "$O" POST "/api/vc/firms/$FIRM/members" "{\"email\":\"pm-$TS@fund.test\",\"role\":\"PORTFOLIO_MANAGER\"}" >/dev/null
req "$O" POST "/api/vc/firms/$FIRM/members" "{\"email\":\"staff-$TS@fund.test\",\"role\":\"STAFF\"}" >/dev/null
req "$R" POST /api/vc/firms '{"name":"Rival Fund '"$TS"'"}' >/dev/null

echo "== Opening a round (Rule 3: founders only)"
ROUND='{"roundType":"SERIES_A","targetAmount":250000000,"currency":"INR","minTicketSize":10000000,"maxTicketSize":100000000,"status":"OPEN"}'
r=$(req "$O" POST /api/funding-cycles "$ROUND"); check "VC opens a round -> 403" 403 "$(status "$r")"
r=$(req "$F" POST /api/funding-cycles "$ROUND"); check "founder opens a round -> 201" 201 "$(status "$r")"
CYCLE=$(json "$(body "$r")" data.id)
check "  bands start at zero" "0 0 0" "$(json "$(body "$r")" data.committedAmount) $(json "$(body "$r")" data.softCommittedAmount) $(json "$(body "$r")" data.indicatedAmount)"
r=$(req "$F" POST /api/funding-cycles "$ROUND"); check "a second open round -> 409" 409 "$(status "$r")"
r=$(req "$F" POST /api/funding-cycles '{"roundType":"SEED","targetAmount":1000,"currency":"rupees","status":"OPEN"}')
check "bad currency -> 400 with a field error" "400 yes" "$(status "$r") $([ "$(json "$(body "$r")" fieldErrors.currency)" != null ] && echo yes || echo no)"

echo "== Deal flow"
r=$(req "$O" GET "/api/funding-cycles/open?sector=Logistics"); check "VC sees the open round (paged)" "Harbourline $TS" "$(json "$(body "$r")" data.items.0.startupName)"
# Deliberately a sector nothing uses. "Fintech" used to stand in for "matches nothing", but the
# demo seeder opens a Fintech round, and this script runs against a seeded database.
r=$(req "$O" GET "/api/funding-cycles/open?sector=Nonexistent%20Sector")
check "filter that matches nothing -> empty page" 0 "$(json "$(body "$r")" data.totalElements)"
r=$(req "$F" GET /api/funding-cycles/open); check "founder browsing deal flow -> 403" 403 "$(status "$r")"

echo "== Commitments"
r=$(req "$T" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"COMMITTED"}')
check "STAFF commits capital -> 403" 403 "$(status "$r")"
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":5000000,"currency":"INR","status":"COMMITTED"}')
check "below the minimum ticket -> 409" 409 "$(status "$r")"
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":500000000,"currency":"INR","status":"COMMITTED"}')
check "above the maximum ticket -> 409" 409 "$(status "$r")"
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"USD","status":"COMMITTED"}')
check "wrong currency -> 409" 409 "$(status "$r")"
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":60000000,"currency":"INR","status":"COMMITTED"}')
check "OWNER commits -> 201" 201 "$(status "$r")"; MINE=$(json "$(body "$r")" data.id)
r=$(req "$P" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":40000000,"currency":"INR","status":"SOFT_COMMITTED"}')
check "same firm commits again -> same record, new band" "201 $MINE" "$(status "$r") $(json "$(body "$r")" data.id)"
r=$(req "$R" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":25000000,"currency":"INR","status":"INDICATED"}')
check "a second firm commits -> 201" 201 "$(status "$r")"; THEIRS=$(json "$(body "$r")" data.id)

echo "== The bands stay apart"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE")
check "soft 40m, indicated 25m, committed 0" "0 40000000 25000000" "$(json "$(body "$r")" data.committedAmount) $(json "$(body "$r")" data.softCommittedAmount) $(json "$(body "$r")" data.indicatedAmount)"
check "  two investors on the round" 2 "$(json "$(body "$r")" data.commitmentCount)"

echo "== Visibility: a firm never sees a rival's commitment"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE/commitments")
check "founder sees every investor" 2 "$(body "$r" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')"
r=$(req "$O" GET "/api/funding-cycles/$CYCLE/commitments")
check "investor sees only its own firm" 1 "$(body "$r" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')"
check "  and it is its own" "$MINE" "$(json "$(body "$r")" data.0.id)"

echo "== Only the committing firm moves its own commitment"
r=$(req "$F" PATCH "/api/commitments/$MINE" '{"status":"COMMITTED"}'); check "founder promotes an investor -> 403" 403 "$(status "$r")"
r=$(req "$R" PATCH "/api/commitments/$MINE" '{"status":"COMMITTED"}'); check "rival moves someone else's -> 403" 403 "$(status "$r")"
r=$(req "$O" PATCH "/api/commitments/$MINE" '{"status":"COMMITTED"}'); check "the owning firm moves its own -> 200" 200 "$(status "$r")"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE"); check "  the money moved bands" "40000000 0" "$(json "$(body "$r")" data.committedAmount) $(json "$(body "$r")" data.softCommittedAmount)"

echo "== The firm's own book"
r=$(req "$O" GET /api/commitments)
check "a firm lists its own commitments" 1 "$(body "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["totalElements"])')"
check "  with the round named on the row" "Harbourline $TS" "$(json "$(body "$r")" data.items.0.startupName)"
check "  and the round type" SERIES_A "$(json "$(body "$r")" data.items.0.roundType)"
r=$(req "$R" GET /api/commitments)
check "the rival's book holds only the rival's pledge" 1 "$(body "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["totalElements"])')"
check "  and it is its own, not ours" "$THEIRS" "$(json "$(body "$r")" data.items.0.id)"
r=$(req "$T" GET /api/commitments)
check "STAFF may read the firm's own book" 200 "$(status "$r")"
r=$(req "$F" GET /api/commitments)
check "a founder has no firm book -> 403" 403 "$(status "$r")"
r=$(req "$O" GET "/api/commitments?status=INDICATED")
check "filtering to a band we hold nothing in -> empty" 0 "$(body "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["totalElements"])')"

echo "== The book summary covers the whole book, not one page"
r=$(req "$O" GET /api/commitments/summary)
check "a firm reads its own totals" 200 "$(status "$r")"
check "  committed is signed money only" 40000000 "$(json "$(body "$r")" data.committedByCurrency.INR)"
check "  likely is committed plus soft" 40000000 "$(json "$(body "$r")" data.likelyByCurrency.INR)"
check "  one live pledge" 1 "$(json "$(body "$r")" data.liveCount)"
check "  nothing waiting to be recorded yet" 0 "$(json "$(body "$r")" data.readyToRecordCount)"
# The figures must not move when the list is filtered to a band the firm holds nothing in — the
# bug this endpoint exists to fix was headline totals computed from the filtered page.
r=$(req "$O" GET "/api/commitments?status=INDICATED")
check "the filtered list is empty" 0 "$(body "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["totalElements"])')"
r=$(req "$O" GET /api/commitments/summary)
check "  but the totals are unchanged by the filter" 40000000 "$(json "$(body "$r")" data.committedByCurrency.INR)"
r=$(req "$T" GET /api/commitments/summary)
check "STAFF may read their own firm's totals" 200 "$(status "$r")"
r=$(req "$F" GET /api/commitments/summary)
check "a founder has no book to total -> 403" 403 "$(status "$r")"

echo "== Withdrawing"
r=$(req "$R" PATCH "/api/commitments/$THEIRS" '{"status":"WITHDRAWN"}')
check "a firm withdraws its own pledge -> 200" 200 "$(status "$r")"
check "  the amount stays on the record" 25000000 "$(json "$(body "$r")" data.amount)"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE")
check "  and it stops counting toward the round" 0 "$(json "$(body "$r")" data.indicatedAmount)"
check "  including the investor count" 1 "$(json "$(body "$r")" data.commitmentCount)"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE/commitments")
check "  but the founder still sees the investor left" 2 "$(body "$r" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')"
r=$(req "$R" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":30000000,"currency":"INR","status":"SOFT_COMMITTED"}')
check "a withdrawn firm coming back reuses its row" "201 $THEIRS" "$(status "$r") $(json "$(body "$r")" data.id)"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE")
check "  and the money is counted again" 30000000 "$(json "$(body "$r")" data.softCommittedAmount)"

echo "== Round history (append-only)"
# Six moves so far on this round, and no more: the 403 attempts above changed nothing, and the
# refused tickets never created a commitment, so neither leaves a row.
#   1 OWNER pledges 60m COMMITTED          (creation)
#   2 the same firm restates it as 40m SOFT (change: band and amount)
#   3 the rival pledges 25m INDICATED      (creation)
#   4 OWNER promotes its own to COMMITTED  (change: band)
#   5 the rival withdraws                  (change: band)
#   6 the rival comes back at 30m SOFT     (change: band and amount)
count_events() { body "$1" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))'; }
r=$(req "$F" GET "/api/funding-cycles/$CYCLE/history")
check "founder sees every move on the round" 6 "$(count_events "$r")"
check "  the first row is a creation (no previous status)" null "$(json "$(body "$r")" data.0.fromStatus)"
check "  and carries the band it started in" COMMITTED "$(json "$(body "$r")" data.0.toStatus)"
check "  the next row carries both sides of the change" "COMMITTED 60000000" "$(json "$(body "$r")" data.1.fromStatus) $(json "$(body "$r")" data.1.fromAmount)"
check "  including where it landed" "SOFT_COMMITTED 40000000" "$(json "$(body "$r")" data.1.toStatus) $(json "$(body "$r")" data.1.toAmount)"
r=$(req "$O" GET "/api/funding-cycles/$CYCLE/history")
check "an investor sees only its own firm's moves" 3 "$(count_events "$r")"
r=$(req "$R" GET "/api/funding-cycles/$CYCLE/history")
check "  and the rival likewise sees only its own" 3 "$(count_events "$r")"
check "  which are the rival's, not ours" "Rival Fund $TS" "$(json "$(body "$r")" data.0.vcFirmName)"
r=$(req "$T" GET "/api/funding-cycles/$CYCLE/history")
check "STAFF may read their own firm's history" 200 "$(status "$r")"

echo "== Converting a pledge is refused while the round is open"
r=$(req "$O" POST "/api/commitments/$MINE/convert" '{}')
check "convert before the round closes -> 409" 409 "$(status "$r")"

echo "== Closing"
r=$(req "$F" PUT "/api/funding-cycles/$CYCLE" '{"roundType":"SERIES_A","targetAmount":250000000,"currency":"USD","status":"OPEN"}')
check "currency change with commitments -> 409" 409 "$(status "$r")"
r=$(req "$F" PUT "/api/funding-cycles/$CYCLE" '{"roundType":"SERIES_A","targetAmount":250000000,"currency":"INR","status":"CLOSED"}')
check "founder closes the round -> 200 with closedAt" "200 yes" "$(status "$r") $([ "$(json "$(body "$r")" data.closedAt)" != null ] && echo yes || echo no)"
r=$(req "$R" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"INDICATED"}')
check "committing to a closed round -> 409" 409 "$(status "$r")"

echo "== A closed round is readable only by the people in it"
S=$(account stranger VC)
req "$S" POST /api/vc/firms '{"name":"Stranger Fund '"$TS"'"}' >/dev/null
r=$(req "$S" GET "/api/funding-cycles/$CYCLE")
check "a firm that never backed a closed round -> 403" 403 "$(status "$r")"
r=$(req "$S" GET "/api/funding-cycles/$CYCLE/history")
check "  and cannot read its history either" 403 "$(status "$r")"
r=$(req "$O" GET "/api/funding-cycles/$CYCLE")
check "the firm that backed it still can" 200 "$(status "$r")"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE")
check "and so can the founder" 200 "$(status "$r")"

echo "== A pledge waiting to be recorded shows up in the totals"
r=$(req "$O" GET /api/commitments/summary)
check "the closed round's pledge is waiting" 1 "$(json "$(body "$r")" data.readyToRecordCount)"

echo "== Promised capital becomes deployed capital"
r=$(req "$T" POST "/api/commitments/$MINE/convert" '{}')
check "STAFF converts -> 403" 403 "$(status "$r")"
r=$(req "$F" POST "/api/commitments/$MINE/convert" '{}')
check "the founder converts someone's pledge -> 403" 403 "$(status "$r")"
r=$(req "$R" POST "/api/commitments/$THEIRS/convert" '{}')
check "a soft commitment -> 409 (never was money)" 409 "$(status "$r")"
# An amount in the body is not a field the endpoint has: the money comes from the pledge, so a
# conversion cannot restate what was promised.
r=$(req "$O" POST "/api/commitments/$MINE/convert" '{"equityPercentage":4.5,"amount":1,"notes":"Cheque cleared"}')
check "the owning firm converts -> 201" 201 "$(status "$r")"
INV=$(json "$(body "$r")" data.convertedInvestmentId)
check "  and the pledge now points at an investment" yes "$([ "$INV" != null ] && echo yes || echo no)"
check "  while staying COMMITTED" COMMITTED "$(json "$(body "$r")" data.status)"
r=$(req "$O" GET "/api/investments/$INV")
check "the investment is in the firm's portfolio" 200 "$(status "$r")"
check "  for the amount pledged, not the amount sent" 40000000 "$(json "$(body "$r")" data.amount)"
check "  in the round's own round type" SERIES_A "$(json "$(body "$r")" data.round)"
# 4.5, not 4.50: the column is NUMERIC(5,2) but JSON carries the number, not its scale.
check "  with the equity the investor supplied" 4.5 "$(json "$(body "$r")" data.equityPercentage)"
r=$(req "$F" GET "/api/funding-cycles/$CYCLE")
check "the round's committed band is untouched by conversion" 40000000 "$(json "$(body "$r")" data.committedAmount)"
r=$(req "$O" POST "/api/commitments/$MINE/convert" '{}')
check "converting the same pledge twice -> 409" 409 "$(status "$r")"
r=$(req "$R" POST "/api/commitments/$MINE/convert" '{}')
check "a rival converts our pledge -> 403" 403 "$(status "$r")"

echo "== Recorded money leaves the promised book"
r=$(req "$O" GET /api/commitments/summary)
# The pledge is still COMMITTED and still counts toward the round, but it is deployed capital now
# and belongs to the portfolio's totals — counting it in both reported the same cheque twice.
check "committed drops to zero once recorded" null "$(json "$(body "$r")" data.committedByCurrency.INR)"
check "  no live pledges left" 0 "$(json "$(body "$r")" data.liveCount)"
check "  and nothing still waiting" 0 "$(json "$(body "$r")" data.readyToRecordCount)"
r=$(req "$O" GET /api/commitments)
check "  but the row is still on the book" 1 "$(body "$r" | python3 -c 'import sys,json;print(json.load(sys.stdin)["data"]["totalElements"])')"
check "  marked with the investment it became" "$INV" "$(json "$(body "$r")" data.items.0.convertedInvestmentId)"

echo "== Active holdings count companies, not cheques"
r=$(req "$O" GET /api/investments/summary)
POS=$(json "$(body "$r")" data.activeCount); CO=$(json "$(body "$r")" data.activeCompanyCount)
check "one cheque, one company so far" "1 1" "$POS $CO"
r=$(req "$O" POST /api/investments "{\"startupId\":\"$(json "$(body "$(req "$O" GET "/api/commitments")")" data.items.0.startupId)\",\"investmentDate\":\"2026-01-15\",\"amount\":10000000,\"currency\":\"INR\",\"round\":\"SEED\",\"status\":\"ACTIVE\"}")
check "a follow-on into the same company -> 201" 201 "$(status "$r")"
r=$(req "$O" GET /api/investments/summary)
check "  two positions, still one company" "2 1" "$(json "$(body "$r")" data.activeCount) $(json "$(body "$r")" data.activeCompanyCount)"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
