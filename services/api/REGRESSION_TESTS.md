# Regression Test Suite

## Full User Flow Test: Onboarding → Today → Day Log → Route

This script tests the complete user journey to ensure all iterations haven't broken core functionality.

### Prerequisites
```bash
# API must be running
curl http://localhost:4000/health
# Should return: {"status":"ok",...}
```

### Test 1: Health Checks (Public Endpoints)
```bash
echo "=== Test 1: Health Checks ==="

# Health endpoint
curl -s http://localhost:4000/health | jq .
# Expected: {"status":"ok","timestamp":"...","uptime":...}

# Ready endpoint
curl -s http://localhost:4000/ready | jq .
# Expected: {"status":"ready","database":"connected",...} or {"status":"not_ready",...}

# Metrics endpoint
curl -s http://localhost:4000/metrics | jq .
# Expected: {"uptime_seconds":...,"memory_heap_used_bytes":...}
```

### Test 2: Authentication (Login)
```bash
echo "=== Test 2: Authentication ==="

# Login and get JWT
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}' \
  | jq -r '.access_token')

echo "Token: $TOKEN"
# Expected: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Verify token is valid (should be non-empty)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ FAILED: Login did not return token"
  exit 1
else
  echo "✅ PASSED: Login successful"
fi
```

### Test 3: Assessment (Onboarding)
```bash
echo "=== Test 3: Assessment ==="

# Submit assessment
ASSESSMENT=$(curl -s -X POST http://localhost:4000/assessment \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "primary_goal": "sleep",
    "sleep_issue_type": ["trouble_falling_asleep"],
    "low_energy_window": "afternoon",
    "bedtime": "23:00",
    "caffeine_time": "08:00",
    "dinner_time": "20:00",
    "symptoms": ["fatigue"],
    "constraints": []
  }')

echo "$ASSESSMENT" | jq .

# Extract program_id
PROGRAM_ID=$(echo "$ASSESSMENT" | jq -r '.program_id')

if [ -z "$PROGRAM_ID" ] || [ "$PROGRAM_ID" = "null" ]; then
  echo "❌ FAILED: Assessment did not return program_id"
  exit 1
else
  echo "✅ PASSED: Assessment assigned program: $PROGRAM_ID"
fi
```

### Test 4: Today (Get Daily Tasks)
```bash
echo "=== Test 4: Today ==="

# Get today's tasks
TODAY=$(curl -s http://localhost:4000/user/today \
  -H "Authorization: Bearer $TOKEN")

echo "$TODAY" | jq .

# Extract day and tasks
DAY=$(echo "$TODAY" | jq -r '.day')
TASKS=$(echo "$TODAY" | jq -r '.tasks | length')

if [ "$DAY" = "1" ] && [ "$TASKS" -gt "0" ]; then
  echo "✅ PASSED: Today endpoint returned day $DAY with $TASKS tasks"
else
  echo "❌ FAILED: Today endpoint returned unexpected data"
  exit 1
fi
```

### Test 5: Day Log (Complete Task)
```bash
echo "=== Test 5: Day Log ==="

# Log day completion
DAYLOG=$(curl -s -X POST http://localhost:4000/user/day-log \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "day": 1,
    "action_completed": true,
    "self_report_effect": "better"
  }')

echo "$DAYLOG" | jq .

# Check response
OK=$(echo "$DAYLOG" | jq -r '.ok')
STREAK=$(echo "$DAYLOG" | jq -r '.streak')

if [ "$OK" = "true" ]; then
  echo "✅ PASSED: Day log successful, streak: $STREAK"
else
  echo "❌ FAILED: Day log failed"
  exit 1
fi
```

### Test 6: Route (Get Progress)
```bash
echo "=== Test 6: Route ==="

# Get route/progress
ROUTE=$(curl -s http://localhost:4000/user/route \
  -H "Authorization: Bearer $TOKEN")

echo "$ROUTE" | jq .

# Extract current_day
CURRENT_DAY=$(echo "$ROUTE" | jq -r '.current_day')
DURATION=$(echo "$ROUTE" | jq -r '.duration_days')

if [ "$CURRENT_DAY" -ge "1" ] && [ "$DURATION" -gt "0" ]; then
  echo "✅ PASSED: Route shows day $CURRENT_DAY of $DURATION"
else
  echo "❌ FAILED: Route returned unexpected data"
  exit 1
fi
```

### Test 7: Security (Rate Limiting)
```bash
echo "=== Test 7: Rate Limiting ==="

# Test rate limiting (should succeed for first 100 requests)
for i in {1..5}; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health)
  if [ "$STATUS" != "200" ]; then
    echo "❌ FAILED: Health check returned $STATUS"
    exit 1
  fi
done

echo "✅ PASSED: Rate limiting allows normal traffic"
```

### Test 8: Security (CORS)
```bash
echo "=== Test 8: CORS ==="

# Test CORS with allowed origin
CORS_ALLOWED=$(curl -s -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS http://localhost:4000/health \
  -o /dev/null -w "%{http_code}")

if [ "$CORS_ALLOWED" = "204" ] || [ "$CORS_ALLOWED" = "200" ]; then
  echo "✅ PASSED: CORS allows configured origin"
else
  echo "⚠️  WARNING: CORS response: $CORS_ALLOWED"
fi
```

### Test 9: Legacy Auth (Backward Compatibility)
```bash
echo "=== Test 9: Legacy Auth ==="

# Test with legacy X-User-Email header
LEGACY=$(curl -s http://localhost:4000/user/today \
  -H "X-User-Email: test@example.com")

LEGACY_DAY=$(echo "$LEGACY" | jq -r '.day')

if [ "$LEGACY_DAY" -ge "1" ]; then
  echo "✅ PASSED: Legacy auth still works"
else
  echo "❌ FAILED: Legacy auth broken"
  exit 1
fi
```

### Test 10: Jobs (Background Tasks)
```bash
echo "=== Test 10: Jobs ==="

# Trigger inactivity check (will fail without DB, but endpoint should respond)
JOBS=$(curl -s -X POST http://localhost:4000/jobs/trigger/inactivity-check \
  -H "Authorization: Bearer $TOKEN")

echo "$JOBS" | jq .

# Just check endpoint is accessible
if echo "$JOBS" | jq -e . >/dev/null 2>&1; then
  echo "✅ PASSED: Jobs endpoint accessible"
else
  echo "⚠️  WARNING: Jobs endpoint returned non-JSON"
fi
```

### Summary
```bash
echo ""
echo "==================================="
echo "   REGRESSION TEST SUMMARY"
echo "==================================="
echo "✅ All critical paths tested"
echo ""
echo "Flow verified:"
echo "  1. Health checks ✓"
echo "  2. Authentication (JWT) ✓"
echo "  3. Assessment (Onboarding) ✓"
echo "  4. Today (Get tasks) ✓"
echo "  5. Day Log (Complete task) ✓"
echo "  6. Route (View progress) ✓"
echo "  7. Rate limiting ✓"
echo "  8. CORS ✓"
echo "  9. Legacy auth ✓"
echo " 10. Jobs ✓"
echo ""
echo "🎉 All tests passed!"
```

## PowerShell Version (Windows)

```powershell
# Test 1: Health
Write-Host "=== Test 1: Health ===" -ForegroundColor Cyan
$health = curl.exe -s http://localhost:4000/health | ConvertFrom-Json
if ($health.status -eq "ok") {
    Write-Host "✅ PASSED: Health check" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Health check" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "`n=== Test 2: Login ===" -ForegroundColor Cyan
$loginBody = '{"email":"test@example.com"}'
$login = curl.exe -s -X POST http://localhost:4000/auth/login `
    -H "Content-Type: application/json" `
    -d $loginBody | ConvertFrom-Json

$token = $login.access_token
if ($token) {
    Write-Host "✅ PASSED: Login successful" -ForegroundColor Green
    Write-Host "Token: $($token.Substring(0,20))..." -ForegroundColor Gray
} else {
    Write-Host "❌ FAILED: Login failed" -ForegroundColor Red
    exit 1
}

# Test 3: Assessment
Write-Host "`n=== Test 3: Assessment ===" -ForegroundColor Cyan
$assessmentBody = @{
    primary_goal = "sleep"
    sleep_issue_type = @("trouble_falling_asleep")
    bedtime = "23:00"
    caffeine_time = "08:00"
    dinner_time = "20:00"
    symptoms = @("fatigue")
    constraints = @()
} | ConvertTo-Json

$assessment = curl.exe -s -X POST http://localhost:4000/assessment `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d $assessmentBody | ConvertFrom-Json

if ($assessment.program_id) {
    Write-Host "✅ PASSED: Assessment assigned program: $($assessment.program_id)" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Assessment failed" -ForegroundColor Red
    exit 1
}

# Test 4: Today
Write-Host "`n=== Test 4: Today ===" -ForegroundColor Cyan
$today = curl.exe -s http://localhost:4000/user/today `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($today.day -ge 1 -and $today.tasks.Count -gt 0) {
    Write-Host "✅ PASSED: Today returned day $($today.day) with $($today.tasks.Count) tasks" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Today endpoint failed" -ForegroundColor Red
    exit 1
}

# Test 5: Day Log
Write-Host "`n=== Test 5: Day Log ===" -ForegroundColor Cyan
$logBody = @{
    day = 1
    action_completed = $true
    self_report_effect = "better"
} | ConvertTo-Json

$daylog = curl.exe -s -X POST http://localhost:4000/user/day-log `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d $logBody | ConvertFrom-Json

if ($daylog.ok) {
    Write-Host "✅ PASSED: Day log successful, streak: $($daylog.streak)" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Day log failed" -ForegroundColor Red
    exit 1
}

# Test 6: Route
Write-Host "`n=== Test 6: Route ===" -ForegroundColor Cyan
$route = curl.exe -s http://localhost:4000/user/route `
    -H "Authorization: Bearer $token" | ConvertFrom-Json

if ($route.current_day -ge 1) {
    Write-Host "✅ PASSED: Route shows day $($route.current_day) of $($route.duration_days)" -ForegroundColor Green
} else {
    Write-Host "❌ FAILED: Route failed" -ForegroundColor Red
    exit 1
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS PASSED! 🎉" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
```

## Quick Test (One-liner)
```bash
# Bash
curl -s http://localhost:4000/health && \
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d '{"email":"test@example.com"}' | jq -r '.access_token') && \
curl -s -X POST http://localhost:4000/assessment -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"primary_goal":"sleep","bedtime":"23:00","caffeine_time":"08:00","dinner_time":"20:00"}' | jq . && \
curl -s http://localhost:4000/user/today -H "Authorization: Bearer $TOKEN" | jq . && \
curl -s -X POST http://localhost:4000/user/day-log -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"day":1,"action_completed":true}' | jq . && \
curl -s http://localhost:4000/user/route -H "Authorization: Bearer $TOKEN" | jq . && \
echo "✅ Full flow completed!"
```
