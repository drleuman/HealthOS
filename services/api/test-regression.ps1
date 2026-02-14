# Simple Regression Test
Write-Host "=== HealthOS API Regression Tests ===" -ForegroundColor Cyan

# Test 1: Health
Write-Host "`nTest 1: Health..." -NoNewline
$health = curl.exe -s http://localhost:4000/health
if ($health -match '"status":"ok"') {
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    exit 1
}

# Test 2: Login
Write-Host "Test 2: Login..." -NoNewline
$login = curl.exe -s -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d "{`"email`":`"test@example.com`"}"
if ($login -match '"access_token"') {
    $token = ($login | ConvertFrom-Json).access_token
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    Write-Host "Response: $login"
    exit 1
}

# Test 3: Assessment
Write-Host "Test 3: Assessment..." -NoNewline
$assessment = curl.exe -s -X POST http://localhost:4000/assessment `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d "{`"primary_goal`":`"sleep`",`"bedtime`":`"23:00`",`"caffeine_time`":`"08:00`",`"dinner_time`":`"20:00`"}"

if ($assessment -match '"program_id"') {
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    exit 1
}

# Test 4: Today
Write-Host "Test 4: Today..." -NoNewline
$today = curl.exe -s http://localhost:4000/user/today -H "Authorization: Bearer $token"
if ($today -match '"day"') {
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    exit 1
}

# Test 5: Day Log
Write-Host "Test 5: Day Log..." -NoNewline
$daylog = curl.exe -s -X POST http://localhost:4000/user/day-log `
    -H "Content-Type: application/json" `
    -H "Authorization: Bearer $token" `
    -d "{`"day`":1,`"action_completed`":true}"

if ($daylog -match '"ok":true') {
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    exit 1
}

# Test 6: Route
Write-Host "Test 6: Route..." -NoNewline
$route = curl.exe -s http://localhost:4000/user/route -H "Authorization: Bearer $token"
if ($route -match '"current_day"') {
    Write-Host " ✅ PASSED" -ForegroundColor Green
}
else {
    Write-Host " ❌ FAILED" -ForegroundColor Red
    exit 1
}

Write-Host "`n==================================" -ForegroundColor Cyan
Write-Host "   ALL TESTS PASSED! 🎉" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "`nUser Flow Verified:" -ForegroundColor White
Write-Host "  ✓ Health checks" -ForegroundColor Gray
Write-Host "  ✓ Authentication (JWT)" -ForegroundColor Gray
Write-Host "  ✓ Assessment (Onboarding)" -ForegroundColor Gray
Write-Host "  ✓ Today (Get tasks)" -ForegroundColor Gray
Write-Host "  ✓ Day Log (Complete task)" -ForegroundColor Gray
Write-Host "  ✓ Route (View progress)" -ForegroundColor Gray
