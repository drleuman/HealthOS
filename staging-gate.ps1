
param (
    [Parameter(Mandatory = $true)]
    [string]$ApiUrl,
    
    [switch]$AllowLocalhost = $false
)

$ErrorActionPreference = "Stop"
$EMAIL_BASE = "gate-$(Get-Date -UFormat %s)"

Write-Host "========================================"
Write-Host "STAGING GATE CHECK - $(Get-Date)"
Write-Host "Target: $ApiUrl"
Write-Host "========================================"

# Validate Environment
if ($ApiUrl -match "localhost|127\.0\.0\.1" -and -not $AllowLocalhost) {
    Write-Host "FAIL: Target is localhost. Use -AllowLocalhost for manual override." -ForegroundColor Red
    Write-Host "RELEASE_DECISION: FAIL" -ForegroundColor Red
    exit 1
}

# Metrics
$global:totalReq = 0
$global:failures = 0
$global:maxLatency = 0
$global:failStep = ""
$global:failEndpoint = ""
$global:failReason = ""

# Helper Function
function Measure-Request {
    param ($Uri, $Method = "Get", $Body = $null, $Headers = $null, $TimeoutSec = 5, $ExpectedStatus = @(200))
    
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    $status = 0
    $err = ""
    $content = $null
    
    try {
        $p = @{ Uri = $Uri; Method = $Method; TimeoutSec = $TimeoutSec; ErrorAction = "Stop" }
        if ($Body) { $p.Body = $Body; $p.ContentType = "application/json" }
        if ($Headers) { $p.Headers = $Headers }
        
        $res = Invoke-WebRequest @p
        $status = [int]$res.StatusCode
        $content = $res.Content
    }
    catch {
        if ($_.Exception.Response) { 
            $status = [int]$_.Exception.Response.StatusCode
        }
        else { 
            $status = 0 
        }
        $err = $_.Exception.Message
    }
    
    $sw.Stop()
    $lat = $sw.ElapsedMilliseconds
    
    $global:totalReq++
    if ($lat -gt $global:maxLatency) { $global:maxLatency = $lat }
    
    return @{ StatusCode = $status; Latency = $lat; Error = $err; Content = $content }
}

function Register-Failure {
    param ($Step, $Endpoint, $Reason)
    if (-not $global:failStep) {
        $global:failStep = $Step
        $global:failEndpoint = $Endpoint
        $global:failReason = $Reason
    }
    $global:failures++
}

function Assert-Success {
    param ($Condition, $Message)
    if (-not $Condition) {
        Write-Host ("FAIL: " + $Message) -ForegroundColor Red
        Write-Host "`n--- FINAL REPORT ---"
        Write-Host ("Requests: " + $global:totalReq)
        Write-Host ("Failures: " + $global:failures)
        Write-Host ("Max Latency: " + $global:maxLatency + " ms")
        Write-Host ("First Failure Step: " + $global:failStep)
        Write-Host ("First Failure Endpoint: " + $global:failEndpoint)
        Write-Host ("First Failure Reason: " + $global:failReason)
        
        Write-Host "RELEASE_DECISION: FAIL" -ForegroundColor Red
        
        # Diagnosis Ideas based on status
        if ($global:failReason -match "502") {
            Write-Host "`n[DIAGNOSIS] 502 Bad Gateway: Check if backend service is running/reachable by proxy/load balancer." -ForegroundColor Yellow
        }
        elseif ($global:failReason -match "504") {
            Write-Host "`n[DIAGNOSIS] 504 Timeout: Check DB connectivity or slow startup." -ForegroundColor Yellow
        }
        elseif ($global:failReason -match "401|403") {
            Write-Host "`n[DIAGNOSIS] Auth Error: Check JWT tokens/secrets match between services." -ForegroundColor Yellow
        }
        else {
            Write-Host "`n[DIAGNOSIS] General: Check container logs and network reachability." -ForegroundColor Yellow
        }

        exit 1
    }
    Write-Host ("PASS: " + $Message) -ForegroundColor Green
}

# STEP 1: STABILITY CHECK (Health + Ready)
Write-Host "`n[STEP 1] Stability Check (50 requests)..."

$step1Failures = 0
for ($i = 1; $i -le 50; $i++) {
    # Check /health
    $uri_health = $ApiUrl + "/health"
    $r1 = Measure-Request -Uri $uri_health
    $c1 = [int]$r1.StatusCode
    if ($c1 -ne 200) { 
        $msg = "  Request " + $i + " (/health) Failed: " + $c1 + " - " + $r1.Error
        Write-Host $msg -ForegroundColor Yellow
        Register-Failure "Step 1 (Stability)" "/health" ($c1 + " " + $r1.Error)
        $step1Failures++
    }
    
    # Check /ready (Database connectivity)
    $uri_ready = $ApiUrl + "/ready"
    $r2 = Measure-Request -Uri $uri_ready
    $c2 = [int]$r2.StatusCode
    if ($c2 -ne 200) {
        $msg = "  Request " + $i + " (/ready) Failed: " + $c2 + " - " + $r2.Error
        Write-Host $msg -ForegroundColor Yellow
        Register-Failure "Step 1 (Stability)" "/ready" ($c2 + " " + $r2.Error)
        $step1Failures++
    }
    
    if ($step1Failures -gt 0) { break }
}

Assert-Success ($step1Failures -eq 0) "Stability: 0 failures in 50 iterations"
Assert-Success ($global:maxLatency -lt 1000) ("Stability: Max Latency < 1000ms (" + $global:maxLatency + " ms)")


# STEP 2: READINESS MONITOR (30s)
Write-Host "`n[STEP 2] Readiness Monitor (30s check)..."
$readinessDrops = 0
for ($i = 1; $i -le 30; $i++) {
    $uri_ready = $ApiUrl + "/ready"
    $r = Measure-Request -Uri $uri_ready -TimeoutSec 2
    if ($r.StatusCode -ne 200) {
        $msg = "  Drop at second " + $i + ": " + $r.StatusCode
        Write-Host $msg -ForegroundColor Yellow
        Register-Failure "Step 2 (Readiness)" "/ready" ($r.StatusCode)
        $readinessDrops++
    }
    Start-Sleep -Seconds 1
}
Assert-Success ($readinessDrops -eq 0) "Service remained READY for 30s"


# STEP 3: REAL SESSION TEST (5x)
Write-Host "`n[STEP 3] Real Session Test (5 Iterations)..."

for ($i = 1; $i -le 5; $i++) {
    $email = "${EMAIL_BASE}-${i}@healthos.test"
    $sessionErr = $null
    
    try {
        # Login
        $uri_login = $ApiUrl + "/auth/login"
        # Using Measure-Request to do the call and get Content + Status
        $l = Measure-Request -Uri $uri_login -Method Post -Body (@{email = $email } | ConvertTo-Json)
        
        if ($l.StatusCode -notin @(200, 201)) { 
            throw ("Login Failed: " + $l.StatusCode) 
        }
        
        $token = ($l.Content | ConvertFrom-Json).access_token
        
        # Assessment
        $uri_assess = $ApiUrl + "/assessment"
        $a = Measure-Request -Uri $uri_assess -Method Post -Headers @{Authorization = ("Bearer " + $token) } -Body (@{primary_goal = "sleep"; bedtime = "23:00"; caffeine_time = "14:00"; dinner_time = "20:00" } | ConvertTo-Json)
        if ($a.StatusCode -notin @(200, 201)) { throw ("Assessment Failed: " + $a.StatusCode) }
        
        # Today
        $uri_today = $ApiUrl + "/user/today"
        $t = Measure-Request -Uri $uri_today -Headers @{Authorization = ("Bearer " + $token) }
        if ($t.StatusCode -notin @(200)) { throw ("Today Failed: " + $t.StatusCode) }
        
        # Log
        $uri_log = $ApiUrl + "/user/day-log"
        $lg = Measure-Request -Uri $uri_log -Method Post -Headers @{Authorization = ("Bearer " + $token) } -Body (@{day = 1; action_completed = $true } | ConvertTo-Json)
        if ($lg.StatusCode -notin @(200, 201)) { throw ("Log Failed: " + $lg.StatusCode) }
         
        Write-Host ("  Iteration " + $i + ": OK")
    }
    catch {
        $m = $_.Exception.Message
        if (-not $m) { $m = $_.ToString() }
        Write-Host ("  Iteration " + $i + " Crash: " + $m)
        Register-Failure "Step 3 (Session)" ("/iteration-$i") $m
        $sessionErr = $m
    }
    
    if ($sessionErr) { break }
}
Assert-Success ($global:failures -eq 0) "5/5 Full Sessions Completed"


# STEP 4: CONCURRENT ACCESS
Write-Host "`n[STEP 4] Concurrent Access (20 parallel requests)..."

# Login once for token
$uri_login = $ApiUrl + "/auth/login"
$lRes = Invoke-WebRequest -Uri $uri_login -Method Post -Body (@{email = ("${EMAIL_BASE}-concurrent@healthos.test") } | ConvertTo-Json) -ContentType "application/json"
$token = ($lRes.Content | ConvertFrom-Json).access_token

$scriptBlock = {
    param($url, $token)
    try {
        $u = $url + "/user/today"
        $h = @{Authorization = ("Bearer " + $token) }
        $r = Invoke-WebRequest -Uri $u -Headers $h -TimeoutSec 10
        return $r.StatusCode
    }
    catch {
        return 500
    }
}

$jobs = @()
for ($i = 1; $i -le 20; $i++) {
    $jobs += Start-Job -ScriptBlock $scriptBlock -ArgumentList $ApiUrl, $token
}

$results = Receive-Job -Job $jobs -Wait
$concFailures = ($results | Where-Object { $_ -ne 200 }).Count

if ($concFailures -gt 0) { 
    Register-Failure "Step 4 (Concurrency)" "/user/today" ($concFailures + " failed requests")
}
Assert-Success ($concFailures -eq 0) "Concurrency: 0 failures in 20 requests"


Write-Host "`n========================================"
Write-Host "RELEASE_DECISION: PASS" -ForegroundColor Green
Write-Host "========================================"
