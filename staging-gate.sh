#!/bin/bash

# Default configuration
API_URL="${1:-$API_URL}"
ALLOW_LOCALHOST="${2:-false}"

# Usage help
if [ -z "$API_URL" ]; then
  echo "❌ Error: API_URL is required."
  echo "Usage: ./staging-gate.sh <API_URL> [ALLOW_LOCALHOST]"
  echo "Example: ./staging-gate.sh https://api-staging.healthos.com"
  exit 1
fi

# Validation
if [[ "$API_URL" == *"localhost"* ]] && [ "$ALLOW_LOCALHOST" != "true" ]; then
  echo "❌ FAIL: Target is localhost. Use 'true' as second argument to override."
  echo "RELEASE_DECISION: FAIL"
  exit 1
fi

echo "========================================"
echo "STAGING GATE CHECK"
echo "Target: $API_URL"
echo "Date: $(date)"
echo "========================================"

# Metrics
TOTAL_REQ=0
FAILURES=0
MAX_LATENCY=0

# Helper function
measure_req() {
  local url=$1
  local method=${2:-GET}
  local data=$3
  local header=$4
  
  start=$(date +%s%3N)
  
  if [ -z "$data" ]; then
      code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url" -H "$header")
  else
      code=$(curl -s -o /dev/null -w "%{http_code}" -X $method "$url" -H "$header" -H "Content-Type: application/json" -d "$data")
  fi
  
  end=$(date +%s%3N)
  lat=$((end-start))
  
  TOTAL_REQ=$((TOTAL_REQ+1))
  if [ $lat -gt $MAX_LATENCY ]; then MAX_LATENCY=$lat; fi
  
  if [[ "$code" -lt 200 ]] || [[ "$code" -ge 300 ]]; then
      echo $code
      return 1
  else
      echo $code
      return 0
  fi
}

assert_success() {
  if [ $1 -ne 0 ]; then
    echo "❌ FAIL: $2"
    echo "--- FINAL REPORT ---"
    echo "Requests: $TOTAL_REQ"
    echo "Failures: $FAILURES"
    echo "Max Latency: $MAX_LATENCY ms"
    echo "RELEASE_DECISION: FAIL"
    exit 1
  fi
  echo "✅ PASS: $2"
}

# STEP 1: STABILITY CHECK
echo -e "\n[STEP 1] Stability Check (50 requests)..."
STEP_FAIL=0

for i in {1..50}; do
    # Health
    c=$(measure_req "$API_URL/health")
    if [ $? -ne 0 ]; then 
        echo "  ⚠️ Req $i (/health) Failed: $c"
        STEP_FAIL=$((STEP_FAIL+1))
    fi
    
    # Ready
    c=$(measure_req "$API_URL/ready")
    if [ $? -ne 0 ]; then 
        echo "  ⚠️ Req $i (/ready) Failed: $c"
        STEP_FAIL=$((STEP_FAIL+1))
    fi
    
    if [ $STEP_FAIL -gt 0 ]; then break; fi
done
FAILURES=$((FAILURES+STEP_FAIL))
assert_success $STEP_FAIL "Stability: 0 failures"
assert_success $(($MAX_LATENCY > 1000)) "Latency check" # Logic inverted for assert helper? No, let's fix
if [ $MAX_LATENCY -gt 1000 ]; then assert_success 1 "Latency < 1000ms"; else assert_success 0 "Latency < 1000ms ($MAX_LATENCY ms)"; fi


# STEP 2: READINESS
echo -e "\n[STEP 2] Readiness Monitor (30s)..."
DROPS=0
for i in {1..30}; do
    c=$(measure_req "$API_URL/ready")
    if [ $? -ne 0 ]; then
        echo "  ⚠️ Drop at second $i: $c"
        DROPS=$((DROPS+1))
    fi
    sleep 1
done
FAILURES=$((FAILURES+DROPS))
assert_success $DROPS "Service remained READY"


# STEP 3: SESSION TEST
echo -e "\n[STEP 3] Real Session Test (5x)..."
SESS_FAIL=0
EMAIL_BASE="gate-$(date +%s)"

for i in {1..5}; do
    EMAIL="${EMAIL_BASE}-${i}@healthos.test"
    
    # Login
    read token < <(curl -s -X POST "$API_URL/auth/login" -H "Content-Type: application/json" -d "{\"email\":\"$EMAIL\"}" | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)
    if [ -z "$token" ]; then SESS_FAIL=1; echo "  Login Failed"; break; fi
    
    # Assessment
    c=$(measure_req "$API_URL/assessment" "POST" '{"primary_goal":"sleep","bedtime":"23:00","caffeine_time":"14:00","dinner_time":"20:00"}' "Authorization: Bearer $token")
    if [ $? -ne 0 ]; then SESS_FAIL=1; echo "  Assessment Failed: $c"; break; fi
    
    # Today
    c=$(measure_req "$API_URL/user/today" "GET" "" "Authorization: Bearer $token")
    if [ $? -ne 0 ]; then SESS_FAIL=1; echo "  Today Failed: $c"; break; fi
    
    # Log
    c=$(measure_req "$API_URL/user/day-log" "POST" '{"day":1,"action_completed":true}' "Authorization: Bearer $token")
    if [ $? -ne 0 ]; then SESS_FAIL=1; echo "  Log Failed: $c"; break; fi
    
    echo "  Iteration $i: OK"
done
FAILURES=$((FAILURES+SESS_FAIL))
assert_success $SESS_FAIL "5/5 Full Sessions Completed"


echo -e "\n========================================"
echo -e "RELEASE_DECISION: PASS"
echo -e "========================================"
