#!/usr/bin/env bash
#
# API smoke test: every portfolio endpoint against a running backend and a real database.
# Covers the rules that only show up end to end — tenancy (one firm can't read another's data),
# role gates, validation, paging, and the summary totals.
#
# It registers fresh accounts each run (timestamped emails), so it is safe to re-run, but it
# WRITES TO WHATEVER DATABASE THE API IS POINTED AT. Use a scratch database, not dashboard_dev:
#
#   scripts/dev-up.sh                       # brings up Postgres, Redis and a scratch database
#   API_URL=http://localhost:8081 scripts/api-smoke-test.sh
#
# Exits non-zero if any check fails.
set -uo pipefail

B=${API_URL:-${B:-http://localhost:8081}}
D=$(mktemp -d); TS=$(date +%s); PASS=0; FAIL=0
trap 'rm -rf "$D"' EXIT

# Signed out, /api/auth/me answers 401 — any HTTP code means the server is there.
if [ "$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$B/api/auth/me")" = 000 ]; then
  echo "No backend answering at $B — start it first (see scripts/dev-up.sh)." >&2
  exit 2
fi
echo "Testing $B"

check() { if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf "  PASS  %-62s %s\n" "$1" "$3"; else FAIL=$((FAIL+1)); printf "  FAIL  %-62s expected=%s got=%s\n" "$1" "$2" "$3"; fi; }
xsrf() { awk '$6=="XSRF-TOKEN"{print $7}' "$1" | tail -1; }
req() { local jar=$1 m=$2 p=$3 body=${4:-} tok; tok=$(xsrf "$jar")
  if [ -n "$body" ]; then curl -s -b "$jar" -c "$jar" -X "$m" -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $tok" -d "$body" -w '|%{http_code}' "$B$p"
  else curl -s -b "$jar" -c "$jar" -X "$m" -H "X-XSRF-TOKEN: $tok" -w '|%{http_code}' "$B$p"; fi; }
status() { echo "${1##*|}"; }; body() { echo "${1%|*}"; }
json() { echo "$1" | python3 -c "import sys,json
d=json.load(sys.stdin); v=d
for k in sys.argv[1].split('.'):
  if isinstance(v, list): v = v[int(k)] if k.isdigit() and int(k) < len(v) else None
  elif isinstance(v, dict): v = v.get(k)
  else: v = None
print('null' if v is None else (str(v).lower() if isinstance(v,bool) else v))" "$2" 2>/dev/null; }
account() { local jar=$D/$1; curl -s -c $jar -o /dev/null $B/api/auth/me
  req $jar POST /api/auth/register "{\"email\":\"$1-$TS@live.test\",\"password\":\"secret123\"}" >/dev/null
  req $jar POST /api/auth/account-type "{\"userType\":\"$2\"}" >/dev/null; echo $jar; }

echo "== Founder: startup profile"
F=$(account founder STARTUP)
r=$(req $F GET /api/startups/me); check "GET /startups/me before setup -> 200 null" "200 null" "$(status "$r") $(json "$(body "$r")" data)"
r=$(req $F POST /api/startups '{"website":"javascript:alert(1)"}'); check "create startup invalid -> 400 with fieldErrors" "400 yes" "$(status "$r") $( [ "$(json "$(body "$r")" fieldErrors.website)" != null ] && [ "$(json "$(body "$r")" fieldErrors.name)" != null ] && echo yes || echo no)"
r=$(req $F POST /api/startups '{"name":"Lumen Live","sector":"Healthtech","stage":"SEED","website":"https://lumen.test","teamSize":18,"annualRevenue":4200000}')
check "create startup -> 201" 201 "$(status "$r")"; SID=$(json "$(body "$r")" data.id)
check "  isRaising serialised" false "$(json "$(body "$r")" data.isRaising)"
r=$(req $F POST /api/startups '{"name":"Second","sector":"SaaS","stage":"SEED"}'); check "second startup for same founder -> 409" 409 "$(status "$r")"
r=$(req $F GET /api/startups/me); check "GET /startups/me -> own startup" "$SID" "$(json "$(body "$r")" data.id)"
r=$(req $F PUT /api/startups/$SID '{"name":"Lumen Health '$TS'","sector":"Healthtech","stage":"SERIES_A"}'); check "update startup -> stage SERIES_A" "200 SERIES_A" "$(status "$r") $(json "$(body "$r")" data.stage)"
C=$(account cofounder STARTUP)
r=$(req $F POST /api/startups/$SID/members "{\"email\":\"cofounder-$TS@live.test\",\"role\":\"CO_FOUNDER\"}"); check "invite co-founder -> 201" 201 "$(status "$r")"
r=$(req $F GET /api/startups/$SID/members); check "team has 2 members" 2 "$(body "$r" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]))')"
FOUNDER_MEMBER=$(body "$r" | python3 -c 'import sys,json;print([m["id"] for m in json.load(sys.stdin)["data"] if m["role"]=="FOUNDER"][0])')
r=$(req $C DELETE /api/startups/$SID/members/$FOUNDER_MEMBER); check "removing the only founder -> 409" 409 "$(status "$r")"

echo "== VC firm + team"
O=$(account owner VC); P=$(account pm VC); T=$(account staff VC)
r=$(req $O POST /api/vc/firms '{"name":"Meridian Live '$TS'","sectors":["Healthtech"]}'); FIRM=$(json "$(body "$r")" data.id); check "create firm -> 201" 201 "$(status "$r")"
req $O POST /api/vc/firms/$FIRM/members "{\"email\":\"pm-$TS@live.test\",\"role\":\"PORTFOLIO_MANAGER\"}" >/dev/null
r=$(req $O POST /api/vc/firms/$FIRM/members "{\"email\":\"staff-$TS@live.test\",\"role\":\"STAFF\"}"); STAFF_MEMBER=$(json "$(body "$r")" data.id)
r=$(req $F POST /api/vc/firms/$FIRM/members "{\"email\":\"x@y.test\",\"role\":\"STAFF\"}"); check "founder managing a firm -> 403" 403 "$(status "$r")"

echo "== Investor discovery (founder side)"
r=$(req $F GET "/api/vc/firms?search=meridian%20live%20$TS"); check "founder searches firms -> finds firm" "$FIRM" "$(json "$(body "$r")" data.0.id)"
r=$(req $F GET /api/vc/firms/$FIRM); check "founder views public firm profile -> 200" 200 "$(status "$r")"
r=$(req $F GET /api/vc/firms/$FIRM/members); check "founder lists firm members -> 403" 403 "$(status "$r")"
r=$(req $O GET "/api/startups?search=lumen%20health%20$TS&stage=SERIES_A"); check "VC discovers startup (paged)" "Lumen Health $TS 1" "$(json "$(body "$r")" data.items.0.name) $(json "$(body "$r")" data.totalElements)"

echo "== Investments"
INV='{"startupId":"'$SID'","investmentDate":"2025-07-11","amount":60000000,"currency":"INR","round":"PRE_SEED","equityPercentage":9.5}'
r=$(req $T POST /api/investments "$INV"); check "STAFF creates investment -> 403" 403 "$(status "$r")"
r=$(req $P POST /api/investments "$INV"); check "PM creates investment -> 201" 201 "$(status "$r")"; INV_ID=$(json "$(body "$r")" data.id)
check "  defaults to ACTIVE, startup name mapped" "ACTIVE Lumen Health $TS" "$(json "$(body "$r")" data.status) $(json "$(body "$r")" data.startupName)"
req $O POST /api/investments '{"startupId":"'$SID'","investmentDate":"2025-01-02","amount":2000000,"currency":"USD","round":"SEED"}' >/dev/null
r=$(req $O POST /api/investments '{"startupId":"'$SID'","investmentDate":"2099-01-01","amount":1,"currency":"inr","round":"SEED"}'); check "future date + bad currency -> 400" "400 yes" "$(status "$r") $( [ "$(json "$(body "$r")" fieldErrors.currency)" != null ] && [ "$(json "$(body "$r")" fieldErrors.investmentDate)" != null ] && echo yes || echo no)"
r=$(req $T GET "/api/investments?size=1"); check "STAFF lists (paged, size 1)" "1 2 2" "$(body "$r" | python3 -c 'import sys,json;d=json.load(sys.stdin)["data"];print(len(d["items"]),d["totalElements"],d["totalPages"])')"
r=$(req $T GET /api/investments/summary); check "summary keeps INR and USD apart" "60000000 2000000 2" "$(json "$(body "$r")" data.totalsByCurrency.INR) $(json "$(body "$r")" data.totalsByCurrency.USD) $(json "$(body "$r")" data.activeCount)"
r=$(req $P PUT /api/investments/$INV_ID '{"startupId":"'$SID'","investmentDate":"2025-07-11","amount":60000000,"currency":"INR","round":"PRE_SEED","status":"EXITED"}'); check "PM marks investment EXITED" "200 EXITED" "$(status "$r") $(json "$(body "$r")" data.status)"
O2=$(account rival VC); req $O2 POST /api/vc/firms '{"name":"Rival Live"}' >/dev/null
r=$(req $O2 GET /api/investments/$INV_ID); check "other firm reads investment -> 403" 403 "$(status "$r")"
r=$(req $O2 DELETE /api/investments/$INV_ID); check "other firm deletes investment -> 403" 403 "$(status "$r")"
r=$(req $F GET /api/investments); check "founder reads investments -> 403" 403 "$(status "$r")"

echo "== Pool"
r=$(req $T POST /api/pool '{"startupId":"'$SID'","companyName":"Lumen Health","tags":["ai"," ai ",""],"interestLevel":"HIGH_PRIORITY"}'); check "STAFF adds on-platform company -> 201" 201 "$(status "$r")"
check "  name/stage from startup, tags cleaned, addedBy" "Lumen Health $TS SERIES_A ['ai'] staff-$TS@live.test" "$(json "$(body "$r")" data.companyName) $(json "$(body "$r")" data.stage) $(json "$(body "$r")" data.tags) $(json "$(body "$r")" data.addedByEmail)"
POOL_ID=$(json "$(body "$r")" data.id)
r=$(req $O POST /api/pool '{"startupId":"'$SID'","interestLevel":"WATCHING"}'); check "same startup twice -> 409" 409 "$(status "$r")"
r=$(req $O POST /api/pool '{"companyName":"  ","interestLevel":"WATCHING"}'); check "off-platform without name -> 400" 400 "$(status "$r")"
r=$(req $O POST /api/pool '{"companyName":"Nimbus Payroll","sector":"SaaS","stage":"SEED","interestLevel":"WATCHING"}'); check "off-platform company -> 201 with own sector" "201 SaaS" "$(status "$r") $(json "$(body "$r")" data.sector)"
r=$(req $O GET "/api/pool?interestLevel=WATCHING"); check "filter by interest level" "1 Nimbus Payroll" "$(json "$(body "$r")" data.totalElements) $(json "$(body "$r")" data.items.0.companyName)"
r=$(req $O2 PUT /api/pool/$POOL_ID '{"interestLevel":"WATCHING"}'); check "other firm edits pool entry -> 403" 403 "$(status "$r")"
r=$(req $O DELETE /api/vc/firms/$FIRM/members/$STAFF_MEMBER); check "remove member who added pool entries -> 200 (was 500)" 200 "$(status "$r")"
r=$(req $O GET "/api/pool?interestLevel=HIGH_PRIORITY"); check "  entry kept, attribution cleared" "Lumen Health $TS null" "$(json "$(body "$r")" data.items.0.companyName) $(json "$(body "$r")" data.items.0.addedByEmail)"
r=$(req $O GET "/api/pool?size=100000"); check "page size capped at 100" 100 "$(json "$(body "$r")" data.size)"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
