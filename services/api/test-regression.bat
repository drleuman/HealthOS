@echo off
echo === HealthOS API Regression Tests ===
echo.

echo Test 1: Health...
curl -s http://localhost:4000/health | findstr "ok" > nul
if %errorlevel%==0 (
    echo PASSED
) else (
    echo FAILED
    exit /b 1
)

echo Test 2: Login...
curl -s -X POST http://localhost:4000/auth/login -H "Content-Type: application/json" -d "{\"email\":\"test@example.com\"}" > login.json
findstr "access_token" login.json > nul
if %errorlevel%==0 (
    echo PASSED
) else (
    echo FAILED
    type login.json
    exit /b 1
)

echo Test 3: Legacy Auth (X-User-Email)...
curl -s http://localhost:4000/user/today -H "X-User-Email: test@example.com" | findstr "day" > nul
if %errorlevel%==0 (
    echo PASSED
) else (
    echo FAILED
    exit /b 1
)

echo.
echo ==================================
echo    ALL CRITICAL TESTS PASSED!
echo ==================================
echo.
echo User Flow Verified:
echo   - Health checks
echo   - Authentication
echo   - User endpoints (legacy auth)
echo.

del login.json 2>nul
