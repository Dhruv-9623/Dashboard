#!/usr/bin/env bash
#
# API coverage test: every endpoint the frontend calls, and the rules that sit around them.
#
# This is the runnable form of "Backend Endpoint Coverage — Dashboard": it walks the 36 endpoints
# that used to answer 404, records every route it reaches, and fails if any is still unmapped. It
# then checks the rules that make the endpoints safe to use — who may decide, who may read whose
# data, and that a chat cannot exist without an accepted request (Business Rule 1).
#
# Registers its own accounts each run and WRITES TO WHATEVER DATABASE THE API IS POINTED AT. Use a
# scratch database, and pass DB_NAME so the run deletes what it created on the way out:
#
#   DB_NAME=dashboard_api PORT=8081 scripts/dev-up.sh
#   API_URL=http://localhost:8081 DB_NAME=dashboard_api scripts/api-coverage-test.sh
#
# Needs the demo data (the `demo` profile, which dev-up.sh enables) for the read-only comparison.
# Exits non-zero if any check fails.
set -uo pipefail

B=${API_URL:-http://localhost:8081}
D=$(mktemp -d); TS=$(date +%s); PASS=0; FAIL=0
COVERED=$D/covered.txt; : > "$COVERED"

# Removes this run's records, keyed on $TS (every name and address it creates carries it), so it
# cannot touch demo or hand-entered data. Order matters: most of these tables use RESTRICT.
cleanup() {
  rm -rf "$D"
  [ -n "${DB_NAME:-}" ] || return 0
  docker compose exec -T postgres psql -U postgres -d "$DB_NAME" -q >/dev/null 2>&1 <<SQL
BEGIN;
CREATE TEMP TABLE s AS SELECT id FROM startups WHERE name LIKE '% $TS';
CREATE TEMP TABLE f AS SELECT id FROM vc_firms WHERE name LIKE '% $TS';
CREATE TEMP TABLE u AS SELECT id FROM users WHERE email LIKE '%-$TS@api.test';
DELETE FROM messages WHERE sender_user_id IN (SELECT id FROM u);
DELETE FROM conversations WHERE connection_request_id IN
  (SELECT id FROM connection_requests WHERE from_user_id IN (SELECT id FROM u) OR to_user_id IN (SELECT id FROM u));
DELETE FROM connection_requests WHERE from_user_id IN (SELECT id FROM u) OR to_user_id IN (SELECT id FROM u);
DELETE FROM events WHERE host_user_id IN (SELECT id FROM u);
DELETE FROM outreach WHERE from_firm_id IN (SELECT id FROM f) OR to_startup_id IN (SELECT id FROM s);
DELETE FROM digests WHERE vc_firm_id IN (SELECT id FROM f);
DELETE FROM conflict_reports WHERE vc_firm_id IN (SELECT id FROM f);
DELETE FROM opportunities WHERE vc_firm_id IN (SELECT id FROM f);
DELETE FROM signals WHERE headline LIKE '%$TS%' OR related_startup_id IN (SELECT id FROM s);
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

# --- helpers ----------------------------------------------------------------------------------

check() {
  if [ "$2" = "$3" ]; then PASS=$((PASS+1)); printf "  PASS  %-66s %s\n" "$1" "$3"
  else FAIL=$((FAIL+1)); printf "  FAIL  %-66s expected=%s got=%s\n" "$1" "$2" "$3"; fi
}
has() { # name, haystack, needle
  if [[ "$2" == *"$3"* ]]; then PASS=$((PASS+1)); printf "  PASS  %-66s contains \"%s\"\n" "$1" "$3"
  else FAIL=$((FAIL+1)); printf "  FAIL  %-66s missing \"%s\" in %s\n" "$1" "$3" "${2:0:120}"; fi
}
lacks() {
  if [[ "$2" != *"$3"* ]]; then PASS=$((PASS+1)); printf "  PASS  %-66s absent \"%s\"\n" "$1" "$3"
  else FAIL=$((FAIL+1)); printf "  FAIL  %-66s unexpectedly has \"%s\"\n" "$1" "$3"; fi
}
xsrf() { awk '$6=="XSRF-TOKEN"{print $7}' "$1" | tail -1; }

# Sends a request and prints "<body>|<status>". Also records the route in $COVERED unless the
# server said the route doesn't exist — that is the whole point of this script.
req() {
  local jar=$1 m=$2 p=$3 body=${4:-} tok out tpl
  tok=$(xsrf "$jar")
  if [ -n "$body" ]; then
    out=$(curl -s -b "$jar" -c "$jar" -X "$m" -H 'Content-Type: application/json' -H "X-XSRF-TOKEN: $tok" -d "$body" -w '|%{http_code}' "$B$p")
  else
    out=$(curl -s -b "$jar" -c "$jar" -X "$m" -H "X-XSRF-TOKEN: $tok" -w '|%{http_code}' "$B$p")
  fi
  # LOG=/path/to/file records every request and response, for working out why a check failed.
  [ -n "${LOG:-}" ] && echo "$m $p ${body:+$body }-> ${out:0:300}" >> "$LOG"
  if [[ "$out" != *"isn't available right now"* ]]; then
    tpl=$(echo "${p%%\?*}" | sed -E 's#[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}#{id}#g')
    echo "$m $tpl" >> "$COVERED"
  fi
  echo "$out"
}
status() { echo "${1##*|}"; }
body() { echo "${1%|*}"; }
json() { echo "$1" | python3 -c "import sys,json
d=json.load(sys.stdin); v=d
for k in sys.argv[1].split('.'):
  if isinstance(v, list): v = v[int(k)] if k.lstrip('-').isdigit() and abs(int(k)) < len(v) else None
  elif isinstance(v, dict): v = v.get(k)
  else: v = None
print('null' if v is None else (str(v).lower() if isinstance(v,bool) else v))" "$2" 2>/dev/null; }
count() { echo "$1" | python3 -c "import sys,json
d=json.load(sys.stdin).get('data'); print(len(d) if isinstance(d, list) else -1)" 2>/dev/null; }

account() { # name, userType -> jar
  local jar=$D/$1; curl -s -c "$jar" -o /dev/null "$B/api/auth/me"
  req "$jar" POST /api/auth/register "{\"email\":\"$1-$TS@api.test\",\"password\":\"secret123\"}" >/dev/null
  req "$jar" POST /api/auth/account-type "{\"userType\":\"$2\"}" >/dev/null
  echo "$jar"
}
demo_login() { # email -> jar
  local jar=$D/demo-${1%%@*}; curl -s -c "$jar" -o /dev/null "$B/api/auth/me"
  req "$jar" POST /api/auth/login "{\"email\":\"$1\",\"password\":\"${DEMO_PASSWORD:-Password123!}\"}" >/dev/null
  echo "$jar"
}
in_days() { python3 -c "import datetime;print((datetime.datetime.utcnow()+datetime.timedelta(days=$1)).strftime('%Y-%m-%dT%H:%M:%SZ'))"; }

# ==============================================================================================
echo "== Setup: two firms (owner + staff each), a founder with a startup, and an outsider"
# ==============================================================================================
O=$(account owner VC);   S=$(account staff VC);    O2=$(account rival VC)
F=$(account founder STARTUP);  X=$(account outsider STARTUP)

r=$(req "$O" POST /api/vc/firms "{\"name\":\"Apex Capital $TS\",\"sectors\":[\"Fintech\"],\"investmentStage\":\"Seed\"}"); FIRM=$(json "$(body "$r")" data.id)
check "firm created" 201 "$(status "$r")"
# A new firm is on the Free plan, which has one seat and the owner is in it.
check "the Free plan's one seat is the owner's, so a teammate is refused" 409 \
  "$(status "$(req "$O" POST "/api/vc/firms/$FIRM/members" '{"email":"staff-'$TS'@api.test","role":"STAFF"}')")"
check "  Starter has room" 200 "$(status "$(req "$O" PUT "/api/vc/firms/$FIRM/plan" '{"planTier":"STARTER"}')")"
req "$O" POST "/api/vc/firms/$FIRM/members" '{"email":"staff-'$TS'@api.test","role":"STAFF"}' >/dev/null
r=$(req "$O2" POST /api/vc/firms "{\"name\":\"Rival Capital $TS\"}"); FIRM2=$(json "$(body "$r")" data.id)

r=$(req "$F" POST /api/startups "{\"name\":\"Lumen Labs $TS\",\"sector\":\"Fintech\",\"stage\":\"SEED\",\"description\":\"Reconciliation for mid-market finance teams.\"}")
STARTUP=$(json "$(body "$r")" data.id); check "startup created" 201 "$(status "$r")"
req "$X" POST /api/startups "{\"name\":\"Bystander $TS\",\"sector\":\"Climate\",\"stage\":\"SERIES_A\"}" >/dev/null

# ==============================================================================================
echo "== Firm settings: thesis and plan (were 404)"
# ==============================================================================================
THESIS='{"sectors":["Fintech","SaaS"],"stages":["SEED","SERIES_A"],"chequeSizeMin":10000000,"chequeSizeMax":100000000,"currency":"INR","notes":"B2B first."}'
r=$(req "$O" PUT "/api/vc/firms/$FIRM/thesis" "$THESIS")
check "owner saves the thesis" 200 "$(status "$r")"
check "  the response carries what was saved" Fintech "$(json "$(body "$r")" data.sectors.0)"
r=$(req "$O" GET /api/vc/firms/me)
check "  and it comes back on the firm" 100000000 "$(json "$(body "$r")" data.thesis.chequeSizeMax)"
check "  with the plan the firm chose" STARTER "$(json "$(body "$r")" data.planTier)"
check "staff cannot change the thesis" 403 "$(status "$(req "$S" PUT "/api/vc/firms/$FIRM/thesis" "$THESIS")")"
r=$(req "$O" PUT "/api/vc/firms/$FIRM/thesis" '{"sectors":["Fintech"],"stages":["SEED"],"chequeSizeMin":90,"chequeSizeMax":10,"currency":"INR"}')
check "a cheque range that cannot contain anything is a 400" 400 "$(status "$r")"
check "an empty sector list is a 400" 400 "$(status "$(req "$O" PUT "/api/vc/firms/$FIRM/thesis" '{"sectors":[],"stages":["SEED"],"currency":"INR"}')")"
check "an unknown stage is a 400" 400 "$(status "$(req "$O" PUT "/api/vc/firms/$FIRM/thesis" '{"sectors":["Fintech"],"stages":["MOON"],"currency":"INR"}')")"

r=$(req "$O" PUT "/api/vc/firms/$FIRM/plan" '{"planTier":"GROWTH"}')
check "owner picks a plan" 200 "$(status "$r")"
check "  and the firm now reports it" GROWTH "$(json "$(body "$r")" data.planTier)"
check "a plan with fewer seats than the team has is refused" 409 "$(status "$(req "$O" PUT "/api/vc/firms/$FIRM/plan" '{"planTier":"FREE"}')")"
check "staff cannot pick a plan" 403 "$(status "$(req "$S" PUT "/api/vc/firms/$FIRM/plan" '{"planTier":"FREE"}')")"
check "an unknown plan is a 400" 400 "$(status "$(req "$O" PUT "/api/vc/firms/$FIRM/plan" '{"planTier":"PLATINUM"}')")"

r=$(req "$F" GET "/api/vc/firms/$FIRM")
check "a founder reads the firm profile" 200 "$(status "$r")"
lacks "  without its thesis" "$(body "$r")" '"thesis"'
lacks "  or its plan" "$(body "$r")" '"planTier"'

# ==============================================================================================
echo "== Deal triage and Conflict Sentinel (were 404)"
# ==============================================================================================
OPP='{"companyName":"Quantaloop","sector":"Fintech","stage":"SEED","askAmount":50000000,"currency":"INR","description":"Embedded credit decisioning for D2C brands, giving merchants working capital within a day."}'
r=$(req "$S" POST /api/opportunities "$OPP"); OPP_ID=$(json "$(body "$r")" data.id)
check "staff can log an opportunity" 201 "$(status "$r")"
check "  it is scored on the spot" 100 "$(json "$(body "$r")" data.fitScore)"
check "  and waits for a decision" PENDING_REVIEW "$(json "$(body "$r")" data.status)"
check "  with the reasoning attached" 4 "$(echo "$(body "$r")" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]["citations"]))')"
check "an unknown stage is a 400" 400 "$(status "$(req "$S" POST /api/opportunities '{"companyName":"X","sector":"Fintech","stage":"MOON","currency":"INR"}')")"
check "opportunities list" 1 "$(count "$(body "$(req "$O" GET /api/opportunities)")")"
check "  and filter by status" 0 "$(count "$(body "$(req "$O" GET '/api/opportunities?status=APPROVED')")")"
check "one opportunity by id" Quantaloop "$(json "$(body "$(req "$O" GET "/api/opportunities/$OPP_ID")")" data.companyName)"
check "rescoring works" 200 "$(status "$(req "$S" POST "/api/opportunities/$OPP_ID/rescore")")"
check "staff cannot decide" 403 "$(status "$(req "$S" PATCH "/api/opportunities/$OPP_ID/status" '{"status":"APPROVED"}')")"
r=$(req "$O" PATCH "/api/opportunities/$OPP_ID/status" '{"status":"APPROVED","decisionNote":"Take the call."}')
check "the owner can" 200 "$(status "$r")"
check "  and the note is kept" "Take the call." "$(json "$(body "$r")" data.decisionNote)"
check "SCORING is not a decision" 400 "$(status "$(req "$O" PATCH "/api/opportunities/$OPP_ID/status" '{"status":"SCORING"}')")"
check "a rival firm cannot see it (404, not 403)" 404 "$(status "$(req "$O2" GET "/api/opportunities/$OPP_ID")")"
check "  nor check it for conflicts" 404 "$(status "$(req "$O2" POST "/api/opportunities/$OPP_ID/conflict-check")")"
check "a founder cannot use triage at all" 403 "$(status "$(req "$F" GET /api/opportunities)")"

r=$(req "$S" GET "/api/opportunities/$OPP_ID/conflict-report")
check "no conflict report before one is run" null "$(json "$(body "$r")" data)"
r=$(req "$S" POST "/api/opportunities/$OPP_ID/conflict-check")
check "a conflict check runs" 200 "$(status "$r")"
check "  across the three dimensions" 3 "$(echo "$(body "$r")" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]["dimensions"]))')"
check "  against an empty portfolio there is nothing to conflict with" 0.0 "$(json "$(body "$r")" data.overallConfidence)"
check "the report is then readable" Quantaloop "$(json "$(body "$(req "$S" GET "/api/opportunities/$OPP_ID/conflict-report")")" data.opportunityName)"
req "$S" POST "/api/opportunities/$OPP_ID/conflict-check" >/dev/null
check "running it again replaces the report, never adds a second" 1 "$(count "$(body "$(req "$S" GET /api/conflict-reports)")")"
check "reports are not shared across firms" 0 "$(count "$(body "$(req "$O2" GET /api/conflict-reports)")")"

# ==============================================================================================
echo "== Portfolio digests (were 404)"
# ==============================================================================================
r=$(req "$S" POST /api/digests/generate); DIGEST=$(json "$(body "$r")" data.id)
check "a digest can be generated" 201 "$(status "$r")"
has "  it says there are no positions yet" "$(json "$(body "$r")" data.summaryMarkdown)" "No active positions"
check "digests list" 1 "$(count "$(body "$(req "$O" GET /api/digests)")")"
check "one digest by id" "$DIGEST" "$(json "$(body "$(req "$O" GET "/api/digests/$DIGEST")")" data.id)"
check "another firm cannot read it" 404 "$(status "$(req "$O2" GET "/api/digests/$DIGEST")")"
check "a founder cannot generate one" 403 "$(status "$(req "$F" POST /api/digests/generate)")"
req "$O" POST /api/digests/generate >/dev/null
check "generating again the same day refreshes it rather than adding a second" 1 "$(count "$(body "$(req "$O" GET /api/digests)")")"

# ==============================================================================================
echo "== Messaging and Business Rule 1 (were 404)"
# ==============================================================================================
check "nobody has a conversation before anyone has asked" 0 "$(count "$(body "$(req "$F" GET /api/conversations)")")"
check "so a message to a conversation that does not exist is a 404" 404 \
  "$(status "$(req "$O" POST /api/conversations/00000000-0000-0000-0000-000000000001/messages '{"body":"hi"}')")"

r=$(req "$O" POST /api/connection-requests "{\"targetType\":\"STARTUP\",\"targetId\":\"$STARTUP\",\"message\":\"Hello\"}"); REQ=$(json "$(body "$r")" data.id)
check "an investor asks a startup to connect" 201 "$(status "$r")"
check "  it starts pending" PENDING "$(json "$(body "$r")" data.status)"
check "  and names the organisation on each side" "Lumen Labs $TS" "$(json "$(body "$r")" data.to.entityName)"
check "asking again while one is waiting is refused" 409 "$(status "$(req "$O" POST /api/connection-requests '{"targetType":"STARTUP","targetId":"'"$STARTUP"'"}')")"
check "a founder cannot ask a startup" 400 "$(status "$(req "$F" POST /api/connection-requests '{"targetType":"STARTUP","targetId":"'"$STARTUP"'"}')")"
check "the founder sees it incoming" 1 "$(count "$(body "$(req "$F" GET '/api/connection-requests?direction=incoming')")")"
check "the investor sees it outgoing" 1 "$(count "$(body "$(req "$O" GET '/api/connection-requests?direction=outgoing')")")"
check "a bad direction is a 400" 400 "$(status "$(req "$O" GET '/api/connection-requests?direction=sideways')")"
check "still no conversation: asking is not consent" 0 "$(count "$(body "$(req "$O" GET /api/conversations)")")"
check "the person who asked cannot accept their own request" 403 "$(status "$(req "$O" PATCH "/api/connection-requests/$REQ" '{"status":"ACCEPTED"}')")"
check "a stranger cannot tell it exists" 404 "$(status "$(req "$X" PATCH "/api/connection-requests/$REQ" '{"status":"ACCEPTED"}')")"
check "PENDING is not an answer" 400 "$(status "$(req "$F" PATCH "/api/connection-requests/$REQ" '{"status":"PENDING"}')")"

r=$(req "$F" PATCH "/api/connection-requests/$REQ" '{"status":"ACCEPTED"}')
check "the founder accepts" 200 "$(status "$r")"
check "  accepting is what opens the conversation" 1 "$(count "$(body "$(req "$F" GET /api/conversations)")")"
CONV=$(json "$(body "$(req "$O" GET /api/conversations)")" data.0.id)
check "  and the investor has it too" 1 "$(count "$(body "$(req "$O" GET /api/conversations)")")"
check "answering twice is refused" 409 "$(status "$(req "$F" PATCH "/api/connection-requests/$REQ" '{"status":"REJECTED"}')")"

r=$(req "$O" POST "/api/conversations/$CONV/messages" '{"body":"  Thanks for connecting  "}')
check "a message can now be sent" 201 "$(status "$r")"
check "  and is trimmed" "Thanks for connecting" "$(json "$(body "$r")" data.body)"
check "an empty message is a 400" 400 "$(status "$(req "$O" POST "/api/conversations/$CONV/messages" '{"body":"   "}')")"
check "the other side sees it" 1 "$(count "$(body "$(req "$F" GET "/api/conversations/$CONV/messages")")")"
check "  as unread" 1 "$(json "$(body "$(req "$F" GET /api/conversations)")" data.0.unreadCount)"
check "  with a preview" "Thanks for connecting" "$(json "$(body "$(req "$F" GET /api/conversations)")" data.0.lastMessagePreview)"
check "reading marks it read" 200 "$(status "$(req "$F" POST "/api/conversations/$CONV/read")")"
check "  so nothing is unread any more" 0 "$(json "$(body "$(req "$F" GET /api/conversations)")" data.0.unreadCount)"
check "an outsider cannot read the conversation (404)" 404 "$(status "$(req "$X" GET "/api/conversations/$CONV/messages")")"
check "  nor write in it" 404 "$(status "$(req "$X" POST "/api/conversations/$CONV/messages" '{"body":"hi"}')")"
check "  nor mark it read" 404 "$(status "$(req "$X" POST "/api/conversations/$CONV/read")")"
check "now they are connected, a second request is refused" 409 "$(status "$(req "$O" POST /api/connection-requests '{"targetType":"STARTUP","targetId":"'"$STARTUP"'"}')")"

# A founder asking a firm, and being turned down, leaves no conversation behind.
r=$(req "$F" POST /api/connection-requests "{\"targetType\":\"VC_FIRM\",\"targetId\":\"$FIRM2\"}"); REQ2=$(json "$(body "$r")" data.id)
check "a founder asks a firm" 201 "$(status "$r")"
check "the firm declines" 200 "$(status "$(req "$O2" PATCH "/api/connection-requests/$REQ2" '{"status":"REJECTED"}')")"
check "  which opens nothing" 0 "$(count "$(body "$(req "$O2" GET /api/conversations)")")"
check "  and a declined request can be asked again" 201 "$(status "$(req "$F" POST /api/connection-requests '{"targetType":"VC_FIRM","targetId":"'"$FIRM2"'"}')")"

# ==============================================================================================
echo "== Events (were 404)"
# ==============================================================================================
START=$(in_days 5); END=$(in_days 6)
r=$(req "$O" POST /api/events "{\"title\":\"Demo day $TS\",\"eventType\":\"DEMO_DAY\",\"startTime\":\"$START\",\"endTime\":\"$END\",\"isPublic\":true}"); EV=$(json "$(body "$r")" data.id)
check "an event can be hosted" 201 "$(status "$r")"
check "  the host is counted as going" 1 "$(json "$(body "$r")" data.attendeeCount)"
check "  hosted under the firm's name" "Apex Capital $TS" "$(json "$(body "$r")" data.hostName)"
check "  and reported public under the name the frontend reads" true "$(json "$(body "$r")" data.isPublic)"
check "an event cannot start in the past" 400 "$(status "$(req "$O" POST /api/events '{"title":"Old","eventType":"WEBINAR","startTime":"2020-01-01T10:00:00Z","isPublic":true}')")"
check "an event cannot end before it starts" 400 "$(status "$(req "$O" POST /api/events '{"title":"Backwards","eventType":"WEBINAR","startTime":"'"$END"'","endTime":"'"$START"'","isPublic":true}')")"
check "a founder sees the public event in the upcoming list" true \
  "$(echo "$(body "$(req "$F" GET '/api/events?upcoming=true')")" | python3 -c "import sys,json;print(any(e['id']=='$EV' for e in json.load(sys.stdin)['data']))" | tr 'A-Z' 'a-z')"
check "and not in the past list" false \
  "$(echo "$(body "$(req "$F" GET '/api/events?upcoming=false')")" | python3 -c "import sys,json;print(any(e['id']=='$EV' for e in json.load(sys.stdin)['data']))" | tr 'A-Z' 'a-z')"
r=$(req "$F" POST "/api/events/$EV/rsvp" '{"rsvpStatus":"GOING"}')
check "the founder replies going" 200 "$(status "$r")"
check "  the head count goes up" 2 "$(json "$(body "$r")" data.attendeeCount)"
check "  and the reply is theirs" GOING "$(json "$(body "$r")" data.myRsvp)"
check "changing the reply does not add a second attendee" 1 \
  "$(json "$(body "$(req "$F" POST "/api/events/$EV/rsvp" '{"rsvpStatus":"MAYBE"}')")" data.attendeeCount)"
check "one event by id" "Demo day $TS" "$(json "$(body "$(req "$F" GET "/api/events/$EV")")" data.title)"
check "only the host sees who replied" 403 "$(status "$(req "$F" GET "/api/events/$EV/attendees")")"
check "  and the host does" 2 "$(count "$(body "$(req "$O" GET "/api/events/$EV/attendees")")")"
check "a guest cannot delete someone else's event" 403 "$(status "$(req "$F" DELETE "/api/events/$EV")")"
r=$(req "$O" POST /api/events "{\"title\":\"Closed door $TS\",\"eventType\":\"NETWORKING\",\"startTime\":\"$START\",\"isPublic\":false}"); PRIV=$(json "$(body "$r")" data.id)
check "a private event is hidden from someone it was not shared with" 404 "$(status "$(req "$F" GET "/api/events/$PRIV")")"
check "  and cannot be replied to by them" 404 "$(status "$(req "$F" POST "/api/events/$PRIV/rsvp" '{"rsvpStatus":"GOING"}')")"
check "the host can delete an event" 204 "$(status "$(req "$O" DELETE "/api/events/$PRIV")")"
check "  and it is gone" 404 "$(status "$(req "$O" GET "/api/events/$PRIV")")"

# ==============================================================================================
echo "== Wishlist (was 404)"
# ==============================================================================================
r=$(req "$O" POST /api/wishlist "{\"targetType\":\"STARTUP\",\"targetId\":\"$STARTUP\",\"note\":\"revisit\"}"); WL=$(json "$(body "$r")" data.id)
check "an investor saves a startup" 201 "$(status "$r")"
check "  the save names its target" "Lumen Labs $TS" "$(json "$(body "$r")" data.targetName)"
check "saving it twice is refused" 409 "$(status "$(req "$O" POST /api/wishlist '{"targetType":"STARTUP","targetId":"'"$STARTUP"'"}')")"
check "an investor cannot save a firm" 400 "$(status "$(req "$O" POST /api/wishlist '{"targetType":"VC_FIRM","targetId":"'"$FIRM2"'"}')")"
check "something that does not exist is a 404" 404 "$(status "$(req "$O" POST /api/wishlist '{"targetType":"STARTUP","targetId":"00000000-0000-0000-0000-000000000009"}')")"
check "the list shows it" 1 "$(count "$(body "$(req "$O" GET /api/wishlist)")")"
check "a founder saves an investor" 201 "$(status "$(req "$F" POST /api/wishlist '{"targetType":"VC_FIRM","targetId":"'"$FIRM"'"}')")"
check "  and their list is their own" 1 "$(count "$(body "$(req "$F" GET /api/wishlist)")")"
check "someone else cannot delete my item (404)" 404 "$(status "$(req "$F" DELETE "/api/wishlist/$WL")")"
check "I can" 200 "$(status "$(req "$O" DELETE "/api/wishlist/$WL")")"
check "  and it is gone" 0 "$(count "$(body "$(req "$O" GET /api/wishlist)")")"
check "deleting it again is a 404" 404 "$(status "$(req "$O" DELETE "/api/wishlist/$WL")")"

# ==============================================================================================
echo "== Outreach (was 404)"
# ==============================================================================================
r=$(req "$O" POST /api/outreach "{\"toStartupId\":\"$STARTUP\",\"subject\":\"Introduction\",\"body\":\"We would like to learn more.\"}")
check "an owner sends outreach" 201 "$(status "$r")"
check "  it is recorded as sent" SENT "$(json "$(body "$r")" data.status)"
check "  to the named startup" "Lumen Labs $TS" "$(json "$(body "$r")" data.toStartupName)"
check "staff cannot send" 403 "$(status "$(req "$S" POST /api/outreach '{"toStartupId":"'"$STARTUP"'","subject":"s","body":"b"}')")"
check "  but can read what was sent" 1 "$(count "$(body "$(req "$S" GET /api/outreach)")")"
check "a blank subject is a 400" 400 "$(status "$(req "$O" POST /api/outreach '{"toStartupId":"'"$STARTUP"'","subject":"","body":"b"}')")"
check "another firm sees none of it" 0 "$(count "$(body "$(req "$O2" GET /api/outreach)")")"
check "a founder has no outreach" 403 "$(status "$(req "$F" GET /api/outreach)")"

# ==============================================================================================
echo "== Signals (was 404)"
# ==============================================================================================
check "signals load for an investor" 200 "$(status "$(req "$O" GET /api/signals)")"
check "  and for a founder" 200 "$(status "$(req "$F" GET /api/signals)")"
r=$(req "$O" GET '/api/signals?type=REGULATORY')
check "the type filter only returns that type" 0 \
  "$(echo "$(body "$r")" | python3 -c "import sys,json;print(sum(1 for s in json.load(sys.stdin)['data'] if s['signalType']!='REGULATORY'))")"
check "an unknown type is a 400" 400 "$(status "$(req "$O" GET '/api/signals?type=GOSSIP')")"

# ==============================================================================================
echo "== AI suggestions (were 404)"
# ==============================================================================================
check "regenerating works for an investor" 200 "$(status "$(req "$O" POST /api/ai/suggestions/regenerate)")"
r=$(req "$O" GET /api/ai/suggestions)
check "  and the shortlist is non-empty (the seeded startups fit a Fintech/Seed thesis)" true \
  "$([ "$(count "$(body "$r")")" -gt 0 ] && echo true || echo false)"
SUG=$(json "$(body "$r")" data.0.id); SUG_TARGET=$(json "$(body "$r")" data.0.targetId)
check "  each carries a reason" true "$([ -n "$(json "$(body "$r")" data.0.reasoning)" ] && [ "$(json "$(body "$r")" data.0.reasoning)" != null ] && echo true || echo false)"
check "dismissing one works" DISMISSED "$(json "$(body "$(req "$O" PATCH "/api/ai/suggestions/$SUG" '{"status":"DISMISSED"}')")" data.status)"
req "$O" POST /api/ai/suggestions/regenerate >/dev/null
check "regenerating never brings back a dismissed one" DISMISSED \
  "$(echo "$(body "$(req "$O" GET /api/ai/suggestions)")" | python3 -c "import sys,json;print(next(s['status'] for s in json.load(sys.stdin)['data'] if s['id']=='$SUG'))")"
check "someone else cannot change my suggestion (404)" 404 "$(status "$(req "$F" PATCH "/api/ai/suggestions/$SUG" '{"status":"ACTIONED"}')")"
check "regenerating works for a founder" 200 "$(status "$(req "$F" POST /api/ai/suggestions/regenerate)")"
check "  and a founder is shown investors" VC_FOR_STARTUP "$(json "$(body "$(req "$F" GET /api/ai/suggestions)")" data.0.suggestionType)"

# ==============================================================================================
echo "== Comparison (was 404)"
# ==============================================================================================
r=$(req "$O" GET '/api/startups?size=3'); A=$(json "$(body "$r")" data.items.0.id); Bz=$(json "$(body "$r")" data.items.1.id)
r=$(req "$O" POST /api/comparison "{\"startupIds\":[\"$Bz\",\"$A\"]}")
check "two startups compare" 2 "$(count "$(body "$r")")"
check "  in the order asked" "$Bz" "$(json "$(body "$r")" data.0.startup.id)"
check "an empty selection is a 400" 400 "$(status "$(req "$O" POST /api/comparison '{"startupIds":[]}')")"
check "more than six is a 400" 400 "$(status "$(req "$O" POST /api/comparison '{"startupIds":["a","b","c","d","e","f","g"]}')")"
check "a founder cannot compare" 403 "$(status "$(req "$F" POST /api/comparison '{"startupIds":["'"$A"'"]}')")"

# ==============================================================================================
echo "== Insights (was 404)"
# ==============================================================================================
check "a founder opening the firm's profile is counted" 200 "$(status "$(req "$F" GET "/api/vc/firms/$FIRM")")"
req "$F" GET "/api/vc/firms/$FIRM" >/dev/null
r=$(req "$O" GET /api/insights)
check "insights load for an investor" 200 "$(status "$r")"
check "  the profile view is counted once, however often they look" 1 "$(json "$(body "$r")" data.profileViews)"
check "  the firm's own team looking is not counted" 1 \
  "$(req "$O" GET "/api/vc/firms/$FIRM" >/dev/null; json "$(body "$(req "$O" GET /api/insights)")" data.profileViews)"
check "  requests received are counted" 1 "$(json "$(body "$r")" data.wishlistedByCount)"
check "  the funnel has five stages" 5 "$(echo "$(body "$r")" | python3 -c 'import sys,json;print(len(json.load(sys.stdin)["data"]["funnel"]))')"
r=$(req "$F" GET /api/insights)
check "insights load for a founder" 200 "$(status "$r")"
check "  who received one request, accepted" 1 "$(json "$(body "$r")" data.connectionRequestsAccepted)"
check "  and has one active conversation" 1 "$(json "$(body "$r")" data.activeConversations)"

# ==============================================================================================
echo "== Funding rules from the coverage report's notes"
# ==============================================================================================
r=$(req "$F" POST /api/funding-cycles '{"roundType":"SEED","targetAmount":80000000,"currency":"INR","minTicketSize":10000000,"maxTicketSize":40000000,"status":"OPEN"}'); CYCLE=$(json "$(body "$r")" data.id)
check "a founder opens a round" 201 "$(status "$r")"
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":1000,"currency":"INR","status":"INDICATED"}')
check "a pledge below the minimum is a 400, not a 409" 400 "$(status "$r")"
has "  and it says ₹1.00 Cr, not 10000000 INR" "$(json "$(body "$r")" message)" "₹1.00 Cr"
check "a pledge cannot be opened as withdrawn" 400 "$(status "$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"WITHDRAWN"}')")"
check "a pledge in the wrong currency is a 400" 400 "$(status "$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"USD","status":"INDICATED"}')")"

r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"COMMITTED"}'); PLEDGE=$(json "$(body "$r")" data.id)
check "a pledge is made" 201 "$(status "$r")"
check "  the response names the startup" "Lumen Labs $TS" "$(json "$(body "$r")" data.startupName)"
check "  the round type" SEED "$(json "$(body "$r")" data.roundType)"
check "  the round's status" OPEN "$(json "$(body "$r")" data.cycleStatus)"
check "  and the round's target" 80000000 "$(json "$(body "$r")" data.cycleTargetAmount)"
FIRST_AT=$(json "$(body "$r")" data.committedAt)
check "a signed pledge cannot be re-posted as an indication" 409 "$(status "$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"INDICATED"}')")"
check "  nor at a smaller figure" 409 "$(status "$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":15000000,"currency":"INR","status":"COMMITTED"}')")"
check "  nor moved down by PATCH" 409 "$(status "$(req "$O" PATCH "/api/commitments/$PLEDGE" '{"status":"SOFT_COMMITTED"}')")"
sleep 1
r=$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":30000000,"currency":"INR","status":"COMMITTED"}')
check "it can be raised" 201 "$(status "$r")"
check "  and the date moves with it" true "$([ "$(json "$(body "$r")" data.committedAt)" != "$FIRST_AT" ] && echo true || echo false)"
check "a founder cannot move an investor's pledge" 403 "$(status "$(req "$F" PATCH "/api/commitments/$PLEDGE" '{"status":"WITHDRAWN"}')")"
r=$(req "$O" PATCH "/api/commitments/$PLEDGE" '{"status":"WITHDRAWN"}')
check "it can be withdrawn" WITHDRAWN "$(json "$(body "$r")" data.status)"
check "  with the round context on that response too" "Lumen Labs $TS" "$(json "$(body "$r")" data.startupName)"
check "  and a withdrawn pledge can come back" INDICATED \
  "$(json "$(body "$(req "$O" POST "/api/funding-cycles/$CYCLE/commitments" '{"amount":20000000,"currency":"INR","status":"INDICATED"}')")" data.status)"

# ==============================================================================================
echo "== Errors do not leak internals"
# ==============================================================================================
r=$(req "$O" GET /api/definitely-not-a-route)
check "an unmapped route is a 404" 404 "$(status "$r")"
lacks "  that does not echo the path back" "$(body "$r")" "definitely-not-a-route"
lacks "  or an id" "$(body "$(req "$O" PUT "/api/vc/firms/$FIRM/nonsense" '{}')")" "$FIRM"

# ==============================================================================================
echo "== Coverage: every one of the 36 endpoints answered, none unmapped"
# ==============================================================================================
EXPECTED='GET /api/opportunities
GET /api/opportunities/{id}
POST /api/opportunities
PATCH /api/opportunities/{id}/status
POST /api/opportunities/{id}/rescore
POST /api/opportunities/{id}/conflict-check
GET /api/opportunities/{id}/conflict-report
GET /api/conflict-reports
GET /api/connection-requests
POST /api/connection-requests
PATCH /api/connection-requests/{id}
GET /api/conversations
GET /api/conversations/{id}/messages
POST /api/conversations/{id}/messages
POST /api/conversations/{id}/read
GET /api/events
GET /api/events/{id}
POST /api/events
POST /api/events/{id}/rsvp
GET /api/events/{id}/attendees
GET /api/ai/suggestions
PATCH /api/ai/suggestions/{id}
POST /api/ai/suggestions/regenerate
GET /api/digests
GET /api/digests/{id}
POST /api/digests/generate
GET /api/wishlist
POST /api/wishlist
DELETE /api/wishlist/{id}
GET /api/outreach
POST /api/outreach
PUT /api/vc/firms/{id}/thesis
PUT /api/vc/firms/{id}/plan
GET /api/insights
GET /api/signals
POST /api/comparison'
MISSING=0
while IFS= read -r line; do
  if ! grep -qxF "$line" "$COVERED"; then echo "  MISSING  $line"; MISSING=$((MISSING+1)); fi
done <<< "$EXPECTED"
check "all 36 endpoints in the coverage report are reachable" 0 "$MISSING"

echo
echo "RESULT: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
